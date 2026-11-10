package coffeecode.monitoramento_industrial.model;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Table
@Entity
public class Register implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime dateTime;

    @Column(nullable = false)
    private boolean isMetal;

    public Register(long id, LocalDateTime dateTime, boolean isMetal) {
        this.id = id;
        this.dateTime = dateTime;
        this.isMetal = isMetal;
    }

    public Register() {

    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public boolean isMetal() {
        return isMetal;
    }

    public void setMetal(boolean metal) {
        isMetal = metal;
    }

    @Override
    public String toString() {
        return "Register{" +
                "id=" + id +
                ", dateTime=" + dateTime +
                ", isMetal=" + isMetal +
                '}';
    }
}
