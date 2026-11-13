# ---------------------------------------------------------------
# Etapa 1: compila a API com Maven (imagem só para o build)
# ---------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app

# Baixa as dependências primeiro (fica em cache se o pom.xml não mudar)
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

# Copia o código e gera o .jar
COPY src ./src
RUN mvn -q -B package -DskipTests

# ---------------------------------------------------------------
# Etapa 2: imagem final, só com o Java necessário para rodar
# ---------------------------------------------------------------
FROM eclipse-temurin:25-jre
WORKDIR /app

# Roda com um usuário sem privilégios (boa prática de segurança)
RUN useradd --system --uid 1001 api
USER api

COPY --from=build /app/target/*.jar app.jar

# Porta da API
EXPOSE 8080

# Inicia a API
ENTRYPOINT ["java", "-jar", "app.jar"]
