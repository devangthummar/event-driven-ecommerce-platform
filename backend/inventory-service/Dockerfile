# ===========================
# Stage 1: Build
# ===========================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy POM first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn package -DskipTests -B

# ===========================
# Stage 2: Run
# ===========================
FROM eclipse-temurin-17-jre-alpine
WORKDIR /app

# Copy the built JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8084

ENTRYPOINT ["java", "-jar", "app.jar"]
