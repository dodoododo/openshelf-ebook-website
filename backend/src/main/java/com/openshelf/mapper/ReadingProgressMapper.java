package com.openshelf.mapper;

import com.openshelf.dto.response.ContinueReadingResponse;
import com.openshelf.dto.response.ReadingProgressResponse;
import com.openshelf.entity.ReadingProgress;

public final class ReadingProgressMapper {
    private ReadingProgressMapper() { }
    public static ReadingProgressResponse response(ReadingProgress progress) {
        var file = progress.getBookFile();
        double percentage = Math.round(progress.getCurrentPage() * 10000.0 / file.getPageCount()) / 100.0;
        return new ReadingProgressResponse(progress.getBookId(), file.getId(), file.getVersion(), progress.getCurrentPage(),
                progress.getFurthestPage(), file.getPageCount(), percentage, progress.getLastReadAt(), progress.getCreatedAt(), progress.getUpdatedAt());
    }
    public static ContinueReadingResponse recent(ReadingProgress progress) {
        return new ContinueReadingResponse(BookMapper.response(progress.getBookFile()), response(progress));
    }
}
