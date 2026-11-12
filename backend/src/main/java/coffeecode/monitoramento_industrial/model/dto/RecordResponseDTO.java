package coffeecode.monitoramento_industrial.model.dto;

import coffeecode.monitoramento_industrial.model.Tank;

import java.time.LocalDateTime;

public record RecordResponseDTO(
        Long id,
        LocalDateTime dateTime,
        boolean isMetal,
        double distance,
        Tank tank,
        long tank1Total,
        long tank2Total
) {
}