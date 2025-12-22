package com.pharmacy.pharmacy_management.security;

import com.pharmacy.pharmacy_management.repository.StaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    @Autowired
    private StaffRepository staffRepo;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }
    @Bean
    public UserDetailsService userDetailsService(){
        return username -> staffRepo.findByEmail(username)
                .map(staff ->{
                        System.out.println("role" + staff.getRole());
                        System.out.println("name" + staff.getName());

                        return User.builder()
                        .username(staff.getEmail())
                        .password(staff.getPassword())
                        .roles(staff.getRole().name())
                        .build();})
                .orElseThrow(()-> new UsernameNotFoundException("Wrong user"));
    }
    @Bean
    public DaoAuthenticationProvider authProvider(){
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService());
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/staff/create").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers("/staff/update").authenticated()
                        .requestMatchers(HttpMethod.DELETE,"/staff/delete").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers("/Medicine_Type/addType").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE,"/Medicine_Type/delete_Type").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/Medicine_Type/updateType").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers("/medicine/create").hasAnyRole("ADMIN", "SUPERADMIN")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authProvider())
                .httpBasic(Customizer.withDefaults())
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);
        return http.build();
    }
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    }
