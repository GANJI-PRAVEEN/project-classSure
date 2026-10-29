package com.example.backend.config;

import com.mongodb.ConnectionString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.mongodb.autoconfigure.MongoConnectionDetails;
import org.springframework.boot.mongodb.autoconfigure.MongoProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    @Bean
    public MongoConnectionDetails mongoConnectionDetails(
            Environment env,
            MongoProperties properties) {

        // Check configured properties and environment variables in order of precedence:
        // 1. spring.mongodb.uri (from application.properties or system property)
        // 2. SPRING_DATA_MONGODB_URI (Render's configured environment variable)
        // 3. SPRING_MONGODB_URI (Spring Boot 4 standard environment variable)
        // 4. spring.data.mongodb.uri (legacy property)
        // 5. properties.determineUri() (auto-configured MongoProperties)
        // 6. fallback to localhost for local development
        String uri = env.getProperty("spring.mongodb.uri");
        if (uri == null || uri.isBlank()) {
            uri = env.getProperty("SPRING_DATA_MONGODB_URI");
        }
        if (uri == null || uri.isBlank()) {
            uri = env.getProperty("SPRING_MONGODB_URI");
        }
        if (uri == null || uri.isBlank()) {
            uri = env.getProperty("spring.data.mongodb.uri");
        }
        if (uri == null || uri.isBlank()) {
            uri = properties.determineUri();
        }
        if (uri == null || uri.isBlank()) {
            uri = "mongodb://localhost:27017/db";
        }

        ConnectionString connectionString = new ConnectionString(uri);

        // Ensure database name is set if not included in connection string
        if (connectionString.getDatabase() == null && (properties.getDatabase() == null || properties.getDatabase().isBlank())) {
            String db = env.getProperty("spring.mongodb.database");
            if (db == null || db.isBlank()) {
                db = env.getProperty("SPRING_DATA_MONGODB_DATABASE");
            }
            if (db == null || db.isBlank()) {
                db = env.getProperty("SPRING_MONGODB_DATABASE");
            }
            if (db == null || db.isBlank()) {
                db = "db";
            }
            properties.setDatabase(db);
        }

        // Mask credentials when logging to prevent security leaks
        String maskedUri = maskUri(uri);
        log.info("MongoDB connection configured. Target: {}, Database: {}",
                maskedUri,
                connectionString.getDatabase() != null ? connectionString.getDatabase() : properties.getDatabase());

        return () -> connectionString;
    }

    private String maskUri(String uri) {
        if (uri == null) {
            return "null";
        }
        // Masks credentials between : and @
        return uri.replaceAll("://([^:]+):([^@]+)@", "://$1:****@");
    }
}
