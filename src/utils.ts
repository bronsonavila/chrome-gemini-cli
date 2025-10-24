import wrapAnsi from 'wrap-ansi'

/**
 * Parse command-line arguments into flags and remaining arguments.
 *
 * @param cliArguments - Array of command-line arguments to parse
 * @returns Object containing parsed flags map and remaining arguments array
 *
 * @example
 * ```
 * const { cliFlags, remainingArguments } = parseCliArguments(['--verbose', 'true', 'file.txt'])
 * // cliFlags: Map { '--verbose' => 'true' }
 * // remainingArguments: ['file.txt']
 * ```
 */
export const parseCliArguments = (
  cliArguments: string[]
): { cliFlags: Map<string, string>; remainingArguments: string[] } => {
  const cliFlags = new Map<string, string>()
  const remainingArguments: string[] = []

  // Flags that are known to be boolean (don't take a value).
  const booleanFlags = ['--no-interactive', '--help', '-h']

  let index = 0

  while (index < cliArguments.length) {
    if (cliArguments[index].startsWith('--') && booleanFlags.includes(cliArguments[index])) {
      // Known boolean flag - no value expected.
      cliFlags.set(cliArguments[index], 'true')

      index++
    } else if (
      cliArguments[index].startsWith('--') &&
      index + 1 < cliArguments.length &&
      !cliArguments[index + 1].startsWith('--')
    ) {
      // Flag with a value.
      cliFlags.set(cliArguments[index], cliArguments[index + 1])

      index += 2
    } else if (cliArguments[index].startsWith('--')) {
      // Unknown flag without a value - treat as boolean.
      cliFlags.set(cliArguments[index], 'true')

      index++
    } else {
      // Regular argument (not a flag).
      remainingArguments.push(cliArguments[index])

      index++
    }
  }

  return { cliFlags, remainingArguments }
}

/**
 * Parse a string value as a positive integer.
 *
 * @param value - String value to parse
 * @param defaultValue - Default value to return if parsing fails or value is undefined
 * @param parameterName - Name of the parameter for error messages (default: 'value')
 * @returns Parsed positive integer
 * @throws Error if value is not a positive integer
 *
 * @example
 * ```
 * parsePositiveInteger('42', 10) // Returns 42
 * parsePositiveInteger(undefined, 10) // Returns 10
 * parsePositiveInteger('0', 10, 'count') // Throws: 'count must be a positive number'
 * ```
 */
export const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number,
  parameterName: string = 'value'
): number => {
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)

  if (isNaN(parsed) || parsed < 1) throw new Error(`${parameterName} must be a positive number`)

  return parsed
}

/**
 * Validate that a required environment variable is set.
 *
 * @param variableName - Name of the environment variable
 * @param errorMessage - Optional custom error message
 * @returns The environment variable value
 * @throws Error if the environment variable is not set
 *
 * @example
 * ```
 * const apiKey = validateEnvironmentVariable('API_KEY', 'API_KEY is required')
 * ```
 */
export const validateEnvironmentVariable = (variableName: string, errorMessage?: string): string => {
  const value = process.env[variableName]

  if (!value) throw new Error(errorMessage || `Environment variable ${variableName} is not set`)

  return value
}

/**
 * Get the current terminal width with fallback to 80 columns.
 *
 * @returns Terminal width in columns
 *
 * @example
 * ```
 * const width = getTerminalWidth() // e.g., 120
 * ```
 */
export const getTerminalWidth = (): number => process.stdout.columns || 80

/**
 * Print a separator line that spans the terminal width.
 *
 * @param character - Character to use for the separator (default: '=')
 *
 * @example
 * ```
 * printSeparator() // Prints: ============================================
 * printSeparator('-') // Prints: --------------------------------------------
 * ```
 */
export const printSeparator = (character = '='): void => {
  console.log(character.repeat(getTerminalWidth()))
}

/**
 * Print content in a boxed section with title and automatic text wrapping.
 *
 * @param title - Title to display at the top of the box
 * @param content - Content to display (will be wrapped to fit terminal)
 * @param useError - Use console.error instead of console.log (default: false)
 *
 * @example
 * ```
 * printBox('SUCCESS', 'Operation completed successfully')
 * printBox('ERROR', 'Something went wrong', true)
 * ```
 */
export const printBox = (title: string, content: string, useError = false): void => {
  const terminalWidth = getTerminalWidth()
  const wrapped = wrapAnsi(content, terminalWidth - 4, { hard: true, trim: false })
  const printer = useError ? console.error : console.log

  printer('\n' + '='.repeat(terminalWidth))
  printer(title)
  printer('='.repeat(terminalWidth))
  printer(wrapped)
  printer('='.repeat(terminalWidth))
}
