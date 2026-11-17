package coffeecode.monitoramento_industrial.model.dto;

import coffeecode.monitoramento_industrial.model.Record;

import java.time.LocalDateTime;

public record RecordResponseDTO(
        Long id,
        LocalDateTime dateTime,
        String situation,
        Double productionRate,
        int metalPieces,
        int nonMetalPieces,
        Double distance
) {
    public static RecordResponseDTO from(Record r) {
        boolean legacyMetal = Boolean.TRUE.equals(r.getIsMetal());
        boolean legacyNonMetal = Boolean.FALSE.equals(r.getIsMetal());
        return new RecordResponseDTO(
                r.getId(),
                r.getDateTime(),
                r.getSituation(),
                r.getIsMetal() == null ? r.getProductionRate() : null,
                r.getMetalPieces() == null ? (legacyMetal ? 1 : 0) : r.getMetalPieces(),
                r.getNonMetalPieces() == null ? (legacyNonMetal ? 1 : 0) : r.getNonMetalPieces(),
                r.getDistance()
        );
    }
}
