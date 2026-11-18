package coffeecode.monitoramento_industrial.model.dto;

import coffeecode.monitoramento_industrial.model.Record;

import java.time.LocalDateTime;

public record RecordResponseDTO(
        Long id,
        LocalDateTime dateTime,
        String situation,
        Double productionRate,
        Integer metalPieces,
        Integer nonMetalPieces,
        Double distance
) {

    public static RecordResponseDTO from(Record record) {
        return new RecordResponseDTO(
                record.getId(),
                record.getDateTime(),
                record.getSituation(),
                record.getProductionRate(),
                record.getMetalPieces(),
                record.getNonMetalPieces(),
                record.getDistance()
        );
    }
}