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
  const booleanFlags = ['--help', '-h']

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

/**
 * Sleep for a specified number of milliseconds.
 *
 * @param milliseconds - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 *
 * @example
 * ```
 * await sleep(1000) // Sleep for 1 second
 * ```
 */
export const sleep = (milliseconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds))
