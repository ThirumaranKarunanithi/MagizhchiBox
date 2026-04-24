package com.magizhchi.box.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String email;
    private String name;
    private Long storageUsedBytes;
    private Long storageQuotaBytes;
}
