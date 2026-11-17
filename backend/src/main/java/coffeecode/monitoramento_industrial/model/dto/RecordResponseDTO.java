package coffeecode.monitoramento_industrial.model.dto;

import coffeecode.monitoramento_industrial.model.Record;

import java.time.LocalDateTime;

public record RecordResponseDTO(
        Long id,
        LocalDateTime dateTime,
        String situation,
        double productionRate
) {
    public static RecordResponseDTO from(Record r) {
        return new RecordResponseDTO(
                r.getId(),
                r.getDateTime(),
                r.getSituation(),
                r.getProductionRate()
        );
    }
}
