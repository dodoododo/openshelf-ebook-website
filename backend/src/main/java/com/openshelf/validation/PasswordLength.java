package com.openshelf.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordLengthValidator.class)
public @interface PasswordLength {
    String message() default "Password must contain between {min} and 128 characters";
    int min() default 15;
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
