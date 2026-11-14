package coffeecode.monitoramento_industrial.service;

import coffeecode.monitoramento_industrial.model.Record;
import coffeecode.monitoramento_industrial.model.Tank;
import coffeecode.monitoramento_industrial.model.dto.RecordRequestDTO;
import coffeecode.monitoramento_industrial.model.dto.RecordResponseDTO;
import coffeecode.monitoramento_industrial.repositories.RecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecordService {
    @Autowired
    private RecordRepository recordRepository;

    private List<Long> getTankTotal() {
        long tank1Total = recordRepository.countByTank(Tank.TANK1);
        long tank2Total = recordRepository.countByTank(Tank.TANK2);

        return List.of(tank1Total, tank2Total);
    }

    // Capacidade de cada tanque (peças). Acima disso a API responde 409 (tanque cheio).
    private static final int LIMITE = 50;

    public Record createRecord(RecordRequestDTO recordDTO) {

        if (recordDTO.tank() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O campo 'tank' é obrigatório (TANK1 ou TANK2)"
            );
        }

        List<Long> tankTotals = getTankTotal();

        int total = switch (recordDTO.tank()) {
            case TANK1 -> tankTotals.get(0).intValue();
            case TANK2 -> tankTotals.get(1).intValue();
        };

        if (total >= LIMITE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tank " + recordDTO.tank() + " is full"
            );
        }

        Record r = new Record(
                recordDTO.isMetal(),
                recordDTO.distance(),
                recordDTO.tank()
        );

        return recordRepository.save(r);
    }
    public List<RecordResponseDTO> listRecords() {
        List<Long> tankTotals = getTankTotal();

        long tank1Total = tankTotals.get(0);
        long tank2Total = tankTotals.get(1);

        List<RecordResponseDTO> records = new ArrayList<>();

        for (Record r : recordRepository.findAll()) {
            records.add(new RecordResponseDTO(
                    r.getId(),
                    r.getDateTime(),
                    r.isMetal(),
                    r.getDistance(),
                    r.getTank(),
                    tank1Total,
                    tank2Total
            ));
        }

        return records;
    }
}
