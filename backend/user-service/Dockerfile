# ===========================
# Stage 1: Runtime
# ===========================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy executable Spring Boot JAR
COPY target/*.jar app.jar

EXPOSE 8006

ENTRYPOINT ["java", "-jar", "app.jar"]
