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

    public RecordResponseDTO createRecord(RecordRequestDTO dto) {
        if (dto.situation() == null || dto.situation().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O campo 'situation' é obrigatório"
            );
        }

        if (dto.metalPieces() == null || dto.metalPieces() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'metalPieces' deve ser um inteiro maior ou igual a zero"
            );
        }

        if (dto.nonMetalPieces() == null || dto.nonMetalPieces() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'nonMetalPieces' deve ser um inteiro maior ou igual a zero"
            );
        }

        if (dto.productionRate() == null
                || !Double.isFinite(dto.productionRate())
                || dto.productionRate() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'productionRate' deve ser um número finito maior ou igual a zero"
            );
        }

        if (dto.distance() != null
                && (!Double.isFinite(dto.distance()) || dto.distance() < 0)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'distance' deve ser um número finito maior ou igual a zero"
            );
        }

        Record record = new Record(
                dto.situation(),
                dto.productionRate(),
                dto.metalPieces(),
                dto.nonMetalPieces(),
                dto.distance()
        );

        return RecordResponseDTO.from(recordRepository.save(record));
    }

    public List<RecordResponseDTO> listRecords() {
        return recordRepository
                .findAll(Sort.by("dateTime", "id"))
                .stream()
                .map(RecordResponseDTO::from)
                .toList();
    }
}