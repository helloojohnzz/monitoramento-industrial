package coffeecode.monitoramento_industrial.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import coffeecode.monitoramento_industrial.model.Record;

public interface RecordRepository extends JpaRepository<Record, Long> {
}
