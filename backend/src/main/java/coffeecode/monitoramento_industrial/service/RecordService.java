package coffeecode.monitoramento_industrial.service;

import coffeecode.monitoramento_industrial.model.Record;
import coffeecode.monitoramento_industrial.model.dto.RecordRequestDTO;
import coffeecode.monitoramento_industrial.model.dto.RecordResponseDTO;
import coffeecode.monitoramento_industrial.repositories.RecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RecordService {
    @Autowired
    private RecordRepository recordRepository;

    public RecordResponseDTO createRecord(RecordRequestDTO recordDTO) {
        if (recordDTO.situation() == null || recordDTO.situation().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O campo 'situation' é obrigatório"
            );
        }

        Record r = new Record(
                recordDTO.situation(),
                recordDTO.productionRate(),
                recordDTO.metalPieces(),
                recordDTO.nonMetalPieces()
        );

        return RecordResponseDTO.from(recordRepository.save(r));
    }

    public List<RecordResponseDTO> listRecords() {
        return recordRepository.findAll()
                .stream()
                .map(RecordResponseDTO::from)
                .toList();
    }
}
