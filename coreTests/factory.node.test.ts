#!/usr/bin/env ts-node

const { jtree } = require("../index.js")
import { treeNotationTypes } from "../products/treeNotationTypes"

const testTree: treeNotationTypes.testTree = {}

testTree.makeProgram = equal => {
  // Arrange
  const jibberishRootDir = __dirname + "/../langs/jibberish/"
  const programPath = jibberishRootDir + "sample.jibberish"
  const grammarPath = jibberishRootDir + "jibberish.grammar"

  // Act
  const program = jtree.makeProgram(programPath, grammarPath)
  const result = program.executeSync()

  // Assert
  equal(program.constructor.name, "jibberishNode", "parent program class parsed correctly")
  equal(result, 42)
}

/*NODE_JS_ONLY*/ if (!module.parent) jtree.TestRacer.testSingleFile(__filename, testTree)

export { testTree }
