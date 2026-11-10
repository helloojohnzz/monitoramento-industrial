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

    public Record(long id, LocalDateTime dateTime, boolean isMetal) {
        this.id = id;
        this.dateTime = dateTime;
        this.isMetal = isMetal;
    }

    public Record() {

    }

    @Override
    public String toString() {
        return "Record{" +
                "id=" + id +
                ", dateTime=" + dateTime +
                ", isMetal=" + isMetal +
                '}';
    }
}
