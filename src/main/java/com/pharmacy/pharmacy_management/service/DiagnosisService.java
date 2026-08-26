package com.pharmacy.pharmacy_management.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pharmacy.pharmacy_management.config.AiProperties;
import com.pharmacy.pharmacy_management.dto.DifferentialDto;
import com.pharmacy.pharmacy_management.dto.DifferentialRequestDto;
import com.pharmacy.pharmacy_management.dto.DifferentialResponseDto;
import com.pharmacy.pharmacy_management.exception.DiagnosisServiceException;
import com.pharmacy.pharmacy_management.exception.NoInput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class DiagnosisService {

    @Autowired
    private AiProperties aiProperties;

    private final Logger logger = LoggerFactory.getLogger(DiagnosisService.class);
    private final ObjectMapper objectMapper = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static final String MEDICAL_DISCLAIMER =
        "Educational decision-support for licensed pharmacy staff. " +
        "Not a substitute for a clinician's diagnosis. Refer emergencies to a hospital.";

    private static final String SYSTEM_PROMPT =
        "You are a pharmacist's clinical decision-support assistant. " +
        "Given a patient's symptoms and context, produce a RANKED list of plausible differential diagnoses. " +
        "Output STRICT JSON ONLY (no prose, no markdown fences) with this exact shape:\n" +
        "{\n" +
        "  \"differentials\": [\n" +
        "    {\"condition\":\"...\",\"likelihood\":\"HIGH|MEDIUM|LOW\",\"reasoning\":\"...\"," +
        " \"suggested_actions\":[\"...\"],\"suggested_medicines\":[\"...\"]}\n" +
        "  ],\n" +
        "  \"red_flags\": [\"...\"],\n" +
        "  \"needs_urgent_care\": false,\n" +
        "  \"disclaimer\": \"" + MEDICAL_DISCLAIMER + "\"\n" +
        "}\n" +
        "Rules:\n" +
        "- likelihood is one of HIGH, MEDIUM, LOW.\n" +
        "- List 3 to 5 differentials, most likely first.\n" +
        "- red_flags: symptoms/signs in the input that warrant urgent referral.\n" +
        "- needs_urgent_care: true if any red flag suggests a life-threatening condition.\n" +
        "- Do NOT echo patient identifiers in the output.\n" +
        "- If the symptoms are too vague to assess, return an empty differentials list, " +
        "set needs_urgent_care=false, and explain in the first differential's reasoning.";

    @PreAuthorize("hasRole('SUPERADMIN') or hasRole('ADMIN')")
    public DifferentialResponseDto generateDifferential(DifferentialRequestDto request) {
        if (request == null || request.symptoms() == null || request.symptoms().trim().isEmpty()) {
            throw new NoInput("Symptoms are required to generate a differential.");
        }

        final String caller = safeCallerName();
        logger.info("Differential diagnosis requested by {} (mock={})", caller, aiProperties.isMock());

        if (aiProperties.isMock() || isBlank(aiProperties.getApiKey()) || isBlank(aiProperties.getBaseUrl())) {
            logger.info("LLM not configured (mock=true or missing base-url/api-key) — returning labelled mock output");
            return mockResponse();
        }

        return callLlm(request);
    }

    private DifferentialResponseDto callLlm(DifferentialRequestDto request) {
        final String userPrompt = buildUserPrompt(request);
        final Map<String, Object> body = Map.of(
            "model", aiProperties.getModel(),
            "response_format", Map.of("type", "json_object"),
            "messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userPrompt)
            )
        );

        try {
            RestClient client = RestClient.builder()
                    .baseUrl(aiProperties.getBaseUrl())
                    .build();

            JsonNode root = client.post()
                    .uri("/v1/chat/completions")
                    .header("Authorization", "Bearer " + aiProperties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (root == null) {
                throw new DiagnosisServiceException("LLM returned an empty response.");
            }

            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new DiagnosisServiceException("LLM response had no message content.");
            }

            return objectMapper.readValue(content.asText(), DifferentialResponseDto.class);

        } catch (DiagnosisServiceException e) {
            throw e;
        } catch (RestClientException e) {
            logger.error("LLM HTTP call failed: {}", e.getMessage(), e);
            throw new DiagnosisServiceException("Could not reach the diagnosis AI service.", e);
        } catch (Exception e) {
            logger.error("Failed to parse LLM response: {}", e.getMessage(), e);
            throw new DiagnosisServiceException("The diagnosis AI returned an unparseable response.", e);
        }
    }

    private String buildUserPrompt(DifferentialRequestDto r) {
        return "Symptoms: " + nullSafe(r.symptoms()) + "\n" +
                "Age: " + (r.age() != null ? r.age() : "unknown") + "\n" +
                "Sex: " + nullSafe(r.sex()) + "\n" +
                "Duration: " + nullSafe(r.duration()) + "\n" +
                "Additional notes: " + nullSafe(r.notes());
    }

    /** Labelled placeholder so the UI is fully testable before a real LLM is configured. */
    private DifferentialResponseDto mockResponse() {
        DifferentialDto placeholder = new DifferentialDto(
                "Mock output — configure an LLM to get real results",
                "LOW",
                "No LLM is configured. Set ai.mock=false (AI_MOCK=false) and provide " +
                        "ai.base-url (AI_BASE_URL), ai.api-key (AI_API_KEY) and ai.model (AI_MODEL) " +
                        "to enable real differentials.",
                List.of("Set AI_MOCK=false and provide AI_BASE_URL / AI_API_KEY / AI_MODEL"),
                List.of(),
                null,
                null,
                null
        );
        return new DifferentialResponseDto(
                List.of(placeholder),
                List.of(),
                false,
                "MOCK MODE — no LLM configured. " + MEDICAL_DISCLAIMER,
                null,
                null,
                null
        );
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }

    private String safeCallerName() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            return (auth != null && auth.isAuthenticated()) ? auth.getName() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}
