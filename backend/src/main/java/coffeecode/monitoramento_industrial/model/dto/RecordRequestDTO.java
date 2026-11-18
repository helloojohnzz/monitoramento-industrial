package coffeecode.monitoramento_industrial.model.dto;

public record RecordRequestDTO(
        String situation,
        Double productionRate,
        Integer metalPieces,
        Integer nonMetalPieces,
        Double distance
) {
}