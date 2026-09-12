# syntax=docker/dockerfile:1
# Imagem do serviço `social` (Spring Boot 4 / Java 21) para o Render.
# O Render não tem runtime Java nativo — Java sobe via Docker (P0-DEPLOY).

# ---- build: compila o jar executável via Maven wrapper ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache de dependências: wrapper + pom antes do código-fonte
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

# Código e empacotamento (testes rodam na CI, não na imagem)
COPY src/ src/
RUN ./mvnw -B -q -DskipTests clean package

# ---- runtime: só JRE + jar, usuário não-root ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /app/target/*.jar app.jar
USER app

# O Render injeta $PORT; application.yml já lê server.port=${PORT:...}.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
