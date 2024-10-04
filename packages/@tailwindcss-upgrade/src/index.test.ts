import dedent from 'dedent'
import postcss from 'postcss'
import { expect, it } from 'vitest'
import { formatNodes } from './codemods/format-nodes'
import { migrateContents } from './migrate'

const css = dedent

function migrate(input: string) {
  return migrateContents(input)
    .then((result) => postcss([formatNodes()]).process(result.root, result.opts))
    .then((result) => result.css)
}

it('should print the input as-is', async () => {
  expect(
    await migrate(css`
      /* above */
      .foo/* after */ {
        /* above */
        color:  /* before */ red /* after */;
        /* below */
      }
    `),
  ).toMatchInlineSnapshot(`
    "/* above */
    .foo/* after */ {
      /* above */
      color:  /* before */ red /* after */;
      /* below */
    }"
  `)
})

it('should migrate a stylesheet', async () => {
  expect(
    await migrate(css`
      @tailwind base;

      html {
        overflow: hidden;
      }

      @tailwind components;

      .a {
        z-index: 1;
      }

      @layer components {
        .b {
          z-index: 2;
        }
      }

      .c {
        z-index: 3;
      }

      @tailwind utilities;

      .d {
        z-index: 4;
      }

      @layer utilities {
        .e {
          z-index: 5;
        }
      }
    `),
  ).toMatchInlineSnapshot(`
    "@import 'tailwindcss';

    @layer base {
      html {
        overflow: hidden;
      }
    }

    @layer components {
      .a {
        z-index: 1;
      }
    }

    @utility b {
      z-index: 2;
    }

    @layer components {
      .c {
        z-index: 3;
      }
    }

    @layer utilities {
      .d {
        z-index: 4;
      }
    }

    @utility e {
      z-index: 5;
    }"
  `)
})

it('should migrate a stylesheet (with imports)', async () => {
  expect(
    await migrate(css`
      @import 'tailwindcss/base';
      @import './my-base.css';
      @import 'tailwindcss/components';
      @import './my-components.css';
      @import 'tailwindcss/utilities';
      @import './my-utilities.css';
    `),
  ).toMatchInlineSnapshot(`
    "@import 'tailwindcss';
    @import './my-base.css' layer(base);
    @import './my-components.css' layer(components);
    @import './my-utilities.css' layer(utilities);"
  `)
})

it('should migrate a stylesheet (with preceding rules that should be wrapped in an `@layer`)', async () => {
  expect(
    await migrate(css`
      @charset "UTF-8";
      @layer foo, bar, baz;
      /**! My license comment */
      html {
        color: red;
      }
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `),
  ).toMatchInlineSnapshot(`
    "@charset "UTF-8";
    @layer foo, bar, baz;
    /**! My license comment */
    @import 'tailwindcss';
    @layer base {
      html {
        color: red;
      }
    }"
  `)
})

it('should keep CSS as-is before existing `@layer` at-rules', async () => {
  expect(
    await migrate(css`
      .foo {
        color: blue;
      }

      @layer components {
        .bar {
          color: red;
        }
      }
    `),
  ).toMatchInlineSnapshot(`
    ".foo {
      color: blue;
    }

    @utility bar {
      color: red;
    }"
  `)
})
