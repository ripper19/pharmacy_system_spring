package com.pharmacy.pharmacy_management.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI / differential-diagnosis configuration. All values are supplied via
 * environment variables so no provider/key is ever committed. When
 * {@code mock=true} (the default) the diagnosis service returns labelled
 * placeholder output without calling any LLM — flip the env vars to go live.
 *
 *   ai.base-url  → ${AI_BASE_URL}   e.g. https://api.openai.com  (or http://localhost:11434 for Ollama)
 *   ai.api-key   → ${AI_API_KEY}
 *   ai.model     → ${AI_MODEL}      e.g. gpt-4o-mini
 *   ai.mock      → ${AI_MOCK}        true until a real LLM is wired up
 */
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private String baseUrl = "";
    private String apiKey = "";
    private String model = "gpt-4o-mini";
    private boolean mock = true;

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public boolean isMock() { return mock; }
    public void setMock(boolean mock) { this.mock = mock; }
}
