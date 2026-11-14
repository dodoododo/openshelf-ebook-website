package com.openshelf.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordLengthValidator implements ConstraintValidator<PasswordLength, String> {
    private int min;

    @Override
    public void initialize(PasswordLength annotation) { min = annotation.min(); }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) { return true; }
        int length = password.codePointCount(0, password.length());
        return length >= min && length <= 128;
    }
}
