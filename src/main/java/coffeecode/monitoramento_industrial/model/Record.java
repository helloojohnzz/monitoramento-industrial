package coffeecode.monitoramento_industrial.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Setter
@Getter
@Table
@Entity
public class Record implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime dateTime;

    @Column(nullable = false)
    private boolean isMetal;

<<<<<<< HEAD
    public Record(long id, LocalDateTime dateTime, boolean isMetal) {
=======
    @Column(nullable = false)
    private double distance;

    public Record(long id, LocalDateTime dateTime, boolean isMetal, double distance) {
>>>>>>> eba4a783525aa8f370f1af9569a7cf0f8e5ab3fa
        this.id = id;
        this.dateTime = dateTime;
        this.isMetal = isMetal;
        this.distance = distance;
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
                '}';
    }
}
