package coffeecode.monitoramento_industrial.service;

import coffeecode.monitoramento_industrial.model.Record;
import coffeecode.monitoramento_industrial.model.dto.RecordRequestDTO;
import coffeecode.monitoramento_industrial.model.dto.RecordResponseDTO;
import coffeecode.monitoramento_industrial.repositories.RecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RecordService {
    @Autowired
    private RecordRepository recordRepository;

    public RecordResponseDTO createRecord(RecordRequestDTO recordDTO) {
        boolean legacy = recordDTO.isMetal() != null && recordDTO.situation() == null;
        if (!legacy && (recordDTO.situation() == null || recordDTO.situation().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O campo 'situation' é obrigatório"
            );
        }

        Double distance = recordDTO.distance();
        if (distance != null && (!Double.isFinite(distance) || distance < 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid distance");
        }

        Integer metalPieces = recordDTO.metalPieces();
        Integer nonMetalPieces = recordDTO.nonMetalPieces();
        Double productionRate = recordDTO.productionRate();
        if (legacy) {
            metalPieces = recordDTO.isMetal() ? 1 : 0;
            nonMetalPieces = recordDTO.isMetal() ? 0 : 1;
            productionRate = 0.0;
        } else if (metalPieces == null || metalPieces < 0
                || nonMetalPieces == null || nonMetalPieces < 0
                || productionRate == null || !Double.isFinite(productionRate) || productionRate < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid production measurement");
        }

        Record r = new Record(
                legacy ? "unknown" : recordDTO.situation(),
                productionRate,
                metalPieces,
                nonMetalPieces,
                distance
        );

        if (legacy) {
            r.setIsMetal(recordDTO.isMetal());
            r.setTank(recordDTO.tank());
        }
        return RecordResponseDTO.from(recordRepository.save(r));
    }

    public List<RecordResponseDTO> listRecords() {
        return recordRepository.findAll(Sort.by("dateTime", "id"))
                .stream()
                .map(RecordResponseDTO::from)
                .toList();
    }
}
