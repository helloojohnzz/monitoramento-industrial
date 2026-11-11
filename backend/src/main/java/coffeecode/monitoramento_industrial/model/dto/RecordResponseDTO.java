package coffeecode.monitoramento_industrial.model.dto;

import java.time.LocalDateTime;

public record RecordResponseDTO(
        Long id,
        LocalDateTime dateTime,
        boolean isMetal,
        double distance
) {
}