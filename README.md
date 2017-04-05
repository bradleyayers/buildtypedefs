# Usage

This package is really scrappy and won't get you 100% of the way to having a
drop-in `@types/` package, but it *should* reduce the manual work significantly.

What it **does** simplify is the extraction and conversion of getdocs commented
commonjs modules into TypeScript signatured ES modules. To build the types for a
version of ProseMirror follow these steps:

1. Clone all of the ProseMirror packages, and checkout the version of interest:

        mkdir prosemirror
        cd prosemirror
        git init
        git submodule init
        for NAME in collab commands dropcursor example-setup history inputrules \
          keymap markdown menu model schema-basic schema-list schema-table state \
          test-builder transform view; do
          git submodule add git@github.com:ProseMirror/prosemirror-${NAME}
        done
        git submodule foreach git checkout 0.19.0

2. Run the `compileDirectory` command across all packages:

        node getdocs2ts/src/bin/compileDirectory.js --inDir prosemirror-view/src --outDir types/prosemirror-view

3. `compileDirectory` doesn't create and `import` statements, so that needs to be
   manually performed.

# FAQ

1. A class in the `.js` is not in the output `.d.ts` file?

    Only the classes that are exported (via `exports.Foo = Foo;`) have a
    TypeScript declaration created. It's common in ProseMirror for classes to
    *not* be exported.

    If you want to force a class to be exported, you need to modify the source
    and export it, e.g. add to the bottom:

        exports.Foo = Foo;

    (where `Foo` is the class name)

2. A method of a class is not exported in the output `.d.ts`?

    Only the public methods are described in the `.d.ts`. The getdocs comments
    are used to determine which methods are public. If you want to force a
    method to be exported, modify the source to add a getdocs comment:

        // ::
        foo() {}

# Debugging

It's typical for a new version of ProseMirror to include some new syntax in the
usage of getdocs that this library isn't expecting. In those cases it helps to
use a debugger to dig into what's going wrong.

VS Code has a great debugger, and can be used in the 'Attach to process' mode
after running a command with `--debug-brk`:

# Challenges

Recast's parser combines sibling comments together and associates them with a
node, even when there's empty lines breaking up the comment.
