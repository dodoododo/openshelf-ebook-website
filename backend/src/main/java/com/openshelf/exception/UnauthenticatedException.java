package com.openshelf.exception;

public class UnauthenticatedException extends RuntimeException {
    public UnauthenticatedException() { super("Please sign in to continue"); }
}
