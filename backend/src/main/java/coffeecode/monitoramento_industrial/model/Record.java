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
    private boolean isMetal;

    @Column(nullable = false)
    private double distance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tank tank;

    public Record(boolean isMetal, double distance, Tank tank) {
        this.dateTime = LocalDateTime.now();
        this.isMetal = isMetal;
        this.distance = distance;
        this.tank = tank;
    }

    public Record() {
    }


    @Override
    public String toString() {
        return "Record{" +
                "id=" + id +
                ", dateTime=" + dateTime +
                ", isMetal=" + isMetal +
                ", distance=" + distance +
                ", tank=" + tank +
                '}';
    }
}