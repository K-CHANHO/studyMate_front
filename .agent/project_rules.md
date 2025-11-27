# MyStudent Project Rules & Conventions

This file defines the coding standards and conventions for the MyStudent project.
AI Agents should refer to this file to ensure code consistency.

## 1. ENUM Handling (Standard)

To ensure consistency between Backend and Frontend and to support Korean labels automatically.

### Backend (Java)

- **Annotation**: Always apply `@JsonFormat(shape = JsonFormat.Shape.OBJECT)` to Enum classes.
- **Fields**: Must include a `private final String label;` field for the Korean display name.
- **Structure Example**:

  ```java
  @Getter
  @JsonFormat(shape = JsonFormat.Shape.OBJECT)
  public enum ExampleEnum {
      VALUE("한글라벨");

      private final String label;

      ExampleEnum(String label) {
          this.label = label;
      }

      public String getName() {
          return this.name();
      }
  }
  ```

### Frontend (Vue.js)

- **Utility**: Use `@/utils/enumUtils.js` for **ALL** Enum conversions.
- **Do NOT** create separate utility files (e.g., `subjectUtils.js`) for simple Enum mapping.
- **Display**: Use `getLabel(enumValue)` to display the Korean label.
- **Submission**: Use `getName(enumValue)` when sending the Enum value to the backend API.
- **Example**:

  ```javascript
  import { getLabel, getName } from '@/utils/enumUtils'

  // Template
  <span>{{ getLabel(data.status) }}</span>

  // Script
  const payload = {
    status: getName(form.status)
  }
  ```
