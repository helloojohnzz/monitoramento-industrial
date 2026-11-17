package coffeecode.monitoramento_industrial.model.dto;

public record RecordRequestDTO(
        String situation,
        double productionRate
) {
}
