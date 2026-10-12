# Payment Reminder Assistant Service

## PART 1 - The Rules Engine

### Setup Instructions 

1. Navigate to the TypeScript folder and install dependencies:

```bash
cd typescript
npm install
```

2. Run automated test suite:

```bash
npm test
```

3. Generate the action plan:

```bash
npm run plan -- --invoices ../data/invoices.json --sent ../data/sent.json --today 2026-10-12 --out ../actions.json
```

*(The action plan will be written to `../actions.json` in the specified JSON structure).*

### Execution Flow

1. Verify the validation of the date format and value
2. Verify the availability and authenticity of the data
3. Determine appropriate action based on invoice over due count and avoid duplicate reminders
4. CLI argument parsing and error handling check
5. Prepare deterministic message for each over due status
6. Ensure the output is sorts actions and skipped with sorted by character-by-character invoice_id.
