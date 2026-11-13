package coffeecode.monitoramento_industrial.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/**
 * Controle de acesso da API.
 *
 * - Leitura (GET): liberada, para o dashboard e o app de RA.
 * - Escrita (POST, PUT, DELETE): exige o cabeçalho "X-API-Key" com a chave
 *   configurada na variável de ambiente API_KEY. Só a ponte do IO-Link
 *   (que envia as leituras dos sensores) conhece essa chave.
 *
 * Se API_KEY estiver vazia (desenvolvimento local), nada é exigido.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-API-Key";
    private static final Set<String> METODOS_PROTEGIDOS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Value("${app.security.api-key}")
    private String apiKey;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return apiKey == null || apiKey.isBlank()
                || !METODOS_PROTEGIDOS.contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String recebida = request.getHeader(HEADER);
        if (recebida == null || !iguais(recebida, apiKey)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Chave de API ausente ou inválida\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    // Comparação em tempo constante (evita descobrir a chave medindo o tempo de resposta)
    private static boolean iguais(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
