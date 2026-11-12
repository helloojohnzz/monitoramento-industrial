package coffeecode.monitoramento_industrial.model;

public enum Tank {

    TANK1("Tank 1"),
    TANK2("Tank 2");

    private final String descricao;

    Tank(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}