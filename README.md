# pharmacy management system api
RESTful APi for managing pharmacy inventory. 

**Features include:** **Role based authentication**
                  **Medicine Inventory Management 
                  Concurrent update handling with optimistic locking to ensure data integrity
                  Input sanitization and validation
                  Automatic stock calculation
                  Categorization of Medicines with Types**

**Built WITH:** **BACKEND:** Spring Boot 3.5.9, Java 17
            **Database:** PostgreSQL
            **Security:** Spring Security with BCrypt
            **ORM:** JPA/Hibernate
            
All endpoints are secured with Basic Authentication

**For testing a Superadmin will be created automatically.**
**To test** in bash simply run curl -u "root@example.com:password123" -X POST "http://localhost:8080/Medicine/create" -H "Content-Type: application/json" -d '{ "sku": "MED001",
    "medicineName": "Paracetamol",
    "medicineType": "Analgesic",
    "quantity": 100,
    "description": "Pain reliever"}' 
    
You can also use Postman for tessting, if you dont know about curl or have no access to a trerminal. You can also use it to specify other requests Put, Get.

**Database Schemas**: Staff,
                      Medicine(medicine_type_name foreign key)
                      Medicine_type
                      Sales
                      Sales_item

Future Enhancements - Frontend
Report EXport
