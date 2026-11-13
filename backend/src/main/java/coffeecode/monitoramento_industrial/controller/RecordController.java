package coffeecode.monitoramento_industrial.controller;

import coffeecode.monitoramento_industrial.model.Record;
import coffeecode.monitoramento_industrial.model.dto.RecordRequestDTO;
import coffeecode.monitoramento_industrial.model.dto.RecordResponseDTO;
import coffeecode.monitoramento_industrial.service.RecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/records")
// CORS configurado em config/CorsConfig (variável CORS_ALLOWED_ORIGINS)
public class RecordController {
    @Autowired
    private RecordService recordService;

    @GetMapping
    public List<RecordResponseDTO> getRecord() {
        return recordService.listRecords();
    }

    @PostMapping
    public Record createRecord(@RequestBody RecordRequestDTO recordDTO){
        return recordService.createRecord(recordDTO);
    }


}
