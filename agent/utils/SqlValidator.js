import {workerLogger} from '../../logger/pino.js';
class SQLValidator {    
    constructor() {
        // Define dangerous SQL keywords that should be blocked
        this.dangerousKeywords = [
            'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'TRUNCATE',
            'EXEC', 'EXECUTE', 'EXECUTE IMMEDIATE', 'PREPARE', 'DEALLOCATE',
            'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
            'COPY', 'VACUUM', 'ANALYZE', 'REINDEX', 'CLUSTER'
        ];

        // Define allowed SQL keywords for read operations
        this.allowedKeywords = [
            'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
            'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN',
            'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
            'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'ON', 'AND', 'OR', 'NOT',
            'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL',
            'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'COALESCE', 'NULLIF'
        ];

        // Maximum query length to prevent resource exhaustion
        this.maxQueryLength = 10000;
        
        // Maximum number of tables in a query
        this.maxTables = 10;
        
        // Maximum number of conditions in WHERE clause
        this.maxConditions = 20;
    }

    /**
     * Main validation method that orchestrates all validation checks
     * @param {string} sql - The SQL query to validate
     * @returns {Object} - Validation result with status and details
     */
    validateSqlQuery(sql) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            details: {}
        };

        try {
            // Basic input validation
            if (!sql || typeof sql !== 'string') {
                result.isValid = false;
                result.errors.push('SQL query must be a non-empty string');
                workerLogger.error('SQL query must be a non-empty string');
                return result;
            }

            // Trim whitespace and normalize
            const normalizedSql = sql.trim().toUpperCase();

            // Run all validation checks
            const syntaxCheck = this.validateSqlSyntax(normalizedSql);
            const securityCheck = this.validateSqlSecurity(normalizedSql);
            const queryTypeCheck = this.validateQueryType(normalizedSql);
            const complexityCheck = this.validateQueryComplexity(normalizedSql);

            // Combine results
            result.errors = [
                ...syntaxCheck.errors,
                ...securityCheck.errors,
                ...queryTypeCheck.errors,
                ...complexityCheck.errors
            ];

            result.warnings = [
                ...syntaxCheck.warnings,
                ...securityCheck.warnings,
                ...queryTypeCheck.warnings,
                ...complexityCheck.warnings
            ];

            result.details = {
                syntax: syntaxCheck,
                security: securityCheck,
                queryType: queryTypeCheck,
                complexity: complexityCheck
            };

            // Query is invalid if there are any errors
            result.isValid = result.errors.length === 0;

        } catch (error) {
            workerLogger.error(error, 'error in validateSqlQuery');
            result.isValid = false;
            result.errors.push(`Validation error: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate SQL syntax using regex patterns
     * @param {string} sql - Normalized SQL query
     * @returns {Object} - Syntax validation result
     */
    validateSqlSyntax(sql) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check for basic SELECT statement structure
        // More flexible pattern that handles various SELECT query formats
        const selectPattern = /^SELECT\s+.+FROM\s+.+/i;
        const hasSelect = /^SELECT\s+/i.test(sql);
        const hasFrom = /\bFROM\s+/i.test(sql);
        
        if (!hasSelect || !hasFrom) {
            workerLogger.error('Query must start with SELECT and contain FROM clause');
            result.isValid = false;
            result.errors.push('Query must start with SELECT and contain FROM clause');
        }

        // Check for balanced parentheses
        const openParens = (sql.match(/\(/g) || []).length;
        const closeParens = (sql.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            workerLogger.error('Unbalanced parentheses in SQL query');
            result.isValid = false;
            result.errors.push('Unbalanced parentheses in SQL query');
        }

        // Check for balanced quotes
        const singleQuotes = (sql.match(/'/g) || []).length;
        const doubleQuotes = (sql.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0) {
            workerLogger.error('Unbalanced single quotes in SQL query');
            result.isValid = false;
            result.errors.push('Unbalanced single quotes in SQL query');
        }
        if (doubleQuotes % 2 !== 0) {
            workerLogger.error('Unbalanced double quotes in SQL query');
            result.isValid = false;
            result.errors.push('Unbalanced double quotes in SQL query');
        }

        // Check for semicolon at the end (optional but recommended)
        if (!sql.endsWith(';')) {
            workerLogger.error('Query should end with semicolon');
            result.warnings.push('Query should end with semicolon');
        }

        return result;
    }

    /**
     * Validate SQL security by checking for dangerous operations
     * @param {string} sql - Normalized SQL query
     * @returns {Object} - Security validation result
     */
    validateSqlSecurity(sql) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check for dangerous keywords
        for (const keyword of this.dangerousKeywords) {
            const keywordPattern = new RegExp(`\\b${keyword}\\b`, 'i');
            if (keywordPattern.test(sql)) {
                workerLogger.error(`Dangerous SQL operation detected: ${keyword}`);
                result.isValid = false;
                result.errors.push(`Dangerous SQL operation detected: ${keyword}`);
            }
        }

        // Check for potential SQL injection patterns
        const injectionPatterns = [
            /;\s*DROP/i,
            /;\s*DELETE/i,
            /;\s*INSERT/i,
            /;\s*UPDATE/i,
            /UNION\s+SELECT/i,
            /OR\s+1\s*=\s*1/i,
            /OR\s+'1'\s*=\s*'1'/i,
            /--/i,  // SQL comments
            /\/\*.*\*\//i  // Multi-line comments
        ];

        for (const pattern of injectionPatterns) {
            if (pattern.test(sql)) {
                workerLogger.error('Potential SQL injection pattern detected');
                result.isValid = false;
                result.errors.push('Potential SQL injection pattern detected');
                break;
            }
        }

        // Check for multiple statements (should be prevented)
        const statementCount = (sql.match(/;/g) || []).length;
        if (statementCount > 1) {
            workerLogger.error('Multiple SQL statements are not allowed');
            result.isValid = false;
            result.errors.push('Multiple SQL statements are not allowed');
        }

        return result;
    }

    /**
     * Validate that the query is read-only (SELECT only)
     * @param {string} sql - Normalized SQL query
     * @returns {Object} - Query type validation result
     */
    validateQueryType(sql) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Ensure query starts with SELECT
        if (!sql.startsWith('SELECT')) {
            result.isValid = false;
            result.errors.push('Only SELECT queries are allowed');
        }

        // Check for any non-SELECT operations
        const nonSelectPatterns = [
            /INSERT\s+INTO/i,
            /UPDATE\s+.+\s+SET/i,
            /DELETE\s+FROM/i,
            /CREATE\s+TABLE/i,
            /ALTER\s+TABLE/i,
            /DROP\s+TABLE/i
        ];

        for (const pattern of nonSelectPatterns) {
            if (pattern.test(sql)) {
                workerLogger.error('Only read operations (SELECT) are allowed');
                result.isValid = false;
                result.errors.push('Only read operations (SELECT) are allowed');
                break;
            }
        }

        return result;
    }

    /**
     * Validate query complexity and resource usage
     * @param {string} sql - Normalized SQL query
     * @returns {Object} - Complexity validation result
     */
    validateQueryComplexity(sql) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check query length
        if (sql.length > this.maxQueryLength) {
            workerLogger.error(`Query too long (${sql.length} chars). Maximum allowed: ${this.maxQueryLength}`);
            result.isValid = false;
            result.errors.push(`Query too long (${sql.length} chars). Maximum allowed: ${this.maxQueryLength}`);
        }

        // Count number of tables (FROM and JOIN clauses)
        const tableCount = (sql.match(/\bFROM\b|\bJOIN\b/gi) || []).length;
        if (tableCount > this.maxTables) {
            workerLogger.error(`Too many tables (${tableCount}). Maximum allowed: ${this.maxTables}`);
            result.isValid = false;
            result.errors.push(`Too many tables (${tableCount}). Maximum allowed: ${this.maxTables}`);
        }

        // Count WHERE conditions
        const whereConditions = (sql.match(/\bAND\b|\bOR\b/gi) || []).length;
        if (whereConditions > this.maxConditions) {
            workerLogger.error(`Complex WHERE clause (${whereConditions} conditions). Consider simplifying.`);
            result.warnings.push(`Complex WHERE clause (${whereConditions} conditions). Consider simplifying.`);
        }

        // Check for potential performance issues
        // if (sql.includes('SELECT *')) {
        //     result.warnings.push('Using SELECT * may impact performance. Consider selecting specific columns.');
        // }

        // Check for missing LIMIT clause on large queries
        if (!sql.includes('LIMIT') && (sql.includes('ORDER BY') || tableCount > 3)) {
            workerLogger.error('Consider adding LIMIT clause to prevent large result sets');
            result.warnings.push('Consider adding LIMIT clause to prevent large result sets');
        }

        // Check for subqueries (allow but warn)
        const subqueryCount = (sql.match(/\(/g) || []).length;
        if (subqueryCount > 5) {
            workerLogger.error(`Multiple subqueries detected (${subqueryCount}). Consider optimizing.`);
            result.warnings.push(`Multiple subqueries detected (${subqueryCount}). Consider optimizing.`);
        }

        return result;
    }

    /**
     * Get a summary of validation results
     * @param {Object} validationResult - Result from validateSqlQuery
     * @returns {string} - Human-readable summary
     */
    getValidationSummary(validationResult) {
        if (validationResult.isValid) {
            let summary = '✅ SQL query is valid';
            workerLogger.info(summary, 'SQL query is valid');
            if (validationResult.warnings.length > 0) {
                summary += `\n⚠️  Warnings: ${validationResult.warnings.length}`;
            }
            return summary;
        } else {
            workerLogger.error(`SQL query is invalid\nErrors: ${validationResult.errors.length}`);
            return `❌ SQL query is invalid\nErrors: ${validationResult.errors.length}`;
        }
    }

    /**
     * Sanitize SQL query (basic cleaning)
     * @param {string} sql - Raw SQL query
     * @returns {string} - Sanitized SQL query
     */
    sanitizeSql(sql) {
        workerLogger.info(sql, 'raw sql');
        if (!sql || typeof sql !== 'string') {
            workerLogger.error('SQL query is not a string');
            return '';
        }

        // Remove leading/trailing whitespace
        let sanitized = sql.trim();
        workerLogger.info(sanitized, 'sanitized SQL query');
        // Remove multiple spaces
        sanitized = sanitized.replace(/\s+/g, ' ');
        workerLogger.info(sanitized, 'sanitized SQL query');

        // Ensure proper semicolon at the end
        if (!sanitized.endsWith(';')) {
            workerLogger.error('SQL query should end with semicolon');
            sanitized += ';';
            workerLogger.info(sanitized, 'sanitized SQL query');
        }

        workerLogger.info(sanitized, 'sanitized SQL query');
        return sanitized;
    }
}

export default SQLValidator;
