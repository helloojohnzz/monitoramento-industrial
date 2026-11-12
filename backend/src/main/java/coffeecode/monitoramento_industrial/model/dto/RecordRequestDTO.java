package coffeecode.monitoramento_industrial.model.dto;

import coffeecode.monitoramento_industrial.model.Tank;

public record RecordRequestDTO(
        boolean isMetal,
        double distance,
        Tank tank
) {
}