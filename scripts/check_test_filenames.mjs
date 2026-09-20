import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

const tests_directory = new URL("../tests/", import.meta.url);
const canonical_test_name = /^[a-z0-9]+(?:-[a-z0-9]+)+-test\.(?:ts|tsx)$/u;

async function find_test_files(directory_url) {
  const directory_entries = await readdir(directory_url, {
    withFileTypes: true,
  });
  const test_files = [];

  for (const directory_entry of directory_entries) {
    const entry_url = new URL(directory_entry.name, directory_url);

    if (directory_entry.isDirectory()) {
      entry_url.pathname = `${entry_url.pathname}/`;
      test_files.push(...(await find_test_files(entry_url)));
      continue;
    }

    if (directory_entry.isFile() && /\.(?:ts|tsx)$/u.test(directory_entry.name)) {
      test_files.push(entry_url);
    }
  }

  return test_files;
}

const test_files = await find_test_files(tests_directory);
const invalid_test_files = test_files.filter(
  (test_file) => !canonical_test_name.test(path.basename(test_file.pathname)),
);

if (invalid_test_files.length > 0) {
  for (const invalid_test_file of invalid_test_files) {
    process.stderr.write(
      `Invalid test filename: ${path.relative(process.cwd(), invalid_test_file.pathname)}\n`,
    );
  }

  process.stderr.write(
    "Use module-testpurpose-test.ts or module-testpurpose-test.tsx in lowercase kebab case.\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${test_files.length} canonical test filename(s).\n`);
}
