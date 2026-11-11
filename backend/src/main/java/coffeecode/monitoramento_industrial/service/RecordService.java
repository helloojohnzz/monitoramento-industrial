package coffeecode.monitoramento_industrial.service;

import coffeecode.monitoramento_industrial.model.Record;
import coffeecode.monitoramento_industrial.model.dto.RecordRequestDTO;
import coffeecode.monitoramento_industrial.model.dto.RecordResponseDTO;
import coffeecode.monitoramento_industrial.repositories.RecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecordService {
    @Autowired
    private RecordRepository recordRepository;

    public Record createRecord(RecordRequestDTO recordDTO) {
        Record r =  new Record(recordDTO.isMetal(), recordDTO.distance());
        return  recordRepository.save(r);
    }

    public List<RecordResponseDTO> listRecords(){
        List<RecordResponseDTO> records = new ArrayList<>();
        for(Record r : recordRepository.findAll()){
            records.add(new RecordResponseDTO(r.getId(), r.getDateTime(), r.isMetal(), r.getDistance()));
        }
        return records;
    }
}
