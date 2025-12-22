package com.pharmacy.pharmacy_management.utilities;

import jakarta.persistence.OptimisticLockException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Component;

import java.util.ConcurrentModificationException;
import java.util.function.Supplier;

@Component
public class TransactionRetryUtility {

    private final static Integer MAX_RETRIES = 3;
    private final static Integer RETRY_DELAY_MS = 100;

    public <T> T executeWithRetry(Supplier<T> operation){
        int attempts = 0;

        while(attempts< MAX_RETRIES){
            try {
                return operation.get();
            }catch (OptimisticLockException | ObjectOptimisticLockingFailureException e){
                attempts++;
                if (attempts > MAX_RETRIES){
                    throw new ConcurrentModificationException("Operation failed after " + MAX_RETRIES + ": because resource is being used by many people");
                }
                try {
                    Thread.sleep((long) RETRY_DELAY_MS * attempts);
                }catch (InterruptedException ie){
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Operation interrupted", ie);
                }
            }
        }
        throw new RuntimeException("Unexpected error");
    }

    //for void operations
    public void executeWithRetry(Runnable operation){
        executeWithRetry(()-> {
            operation.run();
            return null;
        });
    }
}
