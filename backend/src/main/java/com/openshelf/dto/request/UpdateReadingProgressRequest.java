package com.openshelf.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record UpdateReadingProgressRequest(@NotNull UUID bookFileId, @NotNull @Min(1) Integer currentPage) { }
