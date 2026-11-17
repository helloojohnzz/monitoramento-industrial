package coffeecode.monitoramento_industrial.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "records")
public class Record implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime dateTime;

    @Column(nullable = false)
    private String situation;

    @Column(nullable = false)
    private Double productionRate;

    @Column(nullable = false)
    private Integer metalPieces;

    @Column(nullable = false)
    private Integer nonMetalPieces;

    private Double distance;

    // Columns retained for records written by the previous API.
    private Boolean isMetal;
    private String tank;

    public Record(String situation, double productionRate, int metalPieces, int nonMetalPieces, Double distance) {
        this.dateTime = LocalDateTime.now();
        this.situation = situation;
        this.productionRate = productionRate;
        this.metalPieces = metalPieces;
        this.nonMetalPieces = nonMetalPieces;
        this.distance = distance;
    }

    public Record() {
    }

    @Override
    public String toString() {
        return "Record{" +
                "id=" + id +
                ", dateTime=" + dateTime +
                ", situation='" + situation + '\'' +
                ", productionRate=" + productionRate +
                ", metalPieces=" + metalPieces +
                ", nonMetalPieces=" + nonMetalPieces +
                '}';
    }
}
