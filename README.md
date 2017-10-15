# getdocs2ts

This is a utility that transforms code documented with getdocs-style doc comments into TypeScript definition files

# Usage

There is no CLI, so you must write a script, e.g.:

```
import getdocs2ts from 'getdocs2ts';

getdocs2ts([
    {
        name: 'prosemirror-history',
        srcFiles: './prosemirror-history/src/*.js',
        outFile: './types/prosemirror-history/index.d.ts',
        header:
`// Type definitions for prosemirror-history 0.21
// Project: https://github.com/ProseMirror/prosemirror-history
// Definitions by: Bradley Ayers <https://github.com/bradleyayers>
//                 David Hahn <https://github.com/davidka>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.1

`
    }
], {
    Transaction: { sourceModule: { name: 'prosemirror-state' } },
    Plugin: { sourceModule: { name: 'prosemirror-state' } },
    EditorState: { sourceModule: { name: 'prosemirror-state' } }
})
```

# Contributing

Build and run tests:

```
npm run build
npm run test
```