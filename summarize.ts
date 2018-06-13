import ts = require('typescript');
import fs = require('fs');

const fileName = process.argv[2];

fs.readFile(fileName, { encoding: "utf-8" }, (err, data) => {
    if (err) throw err;
    const sourceFile = ts.createSourceFile(fileName, data, ts.ScriptTarget.Latest, true);
    go(sourceFile);
});

function go(sourceFile: ts.SourceFile) {
    const parentStack: string[] = [];
    const results: string[] = [];

    ts.forEachChild(sourceFile, recur);
    for (const res of results) {
        console.log(res);
    }

    function recur(node: ts.Node) {
        if (ts.isEnumDeclaration(node)) {
            record("enum", node.name, node.members.map(m => toText(m.name)).join(", "));
            return;
        } else if (ts.isClassDeclaration(node)) {
            record("class", node.name || "default");
            recurInScope(toText(node.name), node);
            return;
        } else if (ts.isModuleDeclaration(node)) {
            if (node.name.kind === ts.SyntaxKind.StringLiteral) {
                record("module", node.name);
                recurInScope(toText(node.name), node);
            } else {
                record("namespace", node.name);
                recurInScope(toText(node.name), node);
            }
            return;
        } else if (ts.isInterfaceDeclaration(node)) {
            record("interface", node.name, node.members.map(m => toText(m.name)).join(", "));
        } else if (ts.isTypeAliasDeclaration(node)) {
            record("type", node.name);
        } else if (ts.isFunctionDeclaration(node)) {
            record("function", node.name);
        } else {
            ts.forEachChild(node, recur);
        }
    }

    function recurInScope(scopeName: string, node: ts.Node) {
        parentStack.push(scopeName);
        ts.forEachChild(node, recur);
        parentStack.pop();
    }

    type Textable = undefined | string | ts.Identifier | ts.StringLiteral | ts.NumericLiteral | ts.ComputedPropertyName;
    function toText(name: Textable) {
        if (typeof name === "string") {
            return name;
        } else if (name === undefined) {
            return "";
        } else {
            return name.getText();
        }
    }

    function record(kind: string, name: Textable, description?: string) {
        const actualName = typeof name === "string" ? name : toText(name);
        const qualifiedName = `${kind} ${[...parentStack, actualName].join(".")}`;
        if (description) {
            results.push(`${qualifiedName} - ${description}`);
        } else {
            results.push(qualifiedName);
        }
    }
}