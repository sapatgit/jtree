import TreeUtils from "../base/TreeUtils"

import { GrammarConstantsErrors, GrammarConstants } from "./GrammarConstants"

import AbstractRuntimeNode from "./AbstractRuntimeNode"
import {
  AbstractGrammarBackedCell,
  GrammarUnknownCellTypeCell,
  GrammarExtraWordCellTypeCell
} from "./GrammarBackedCell"

/*FOR_TYPES_ONLY*/ import AbstractRuntimeProgram from "./AbstractRuntimeProgram"
/*FOR_TYPES_ONLY*/ import GrammarCompilerNode from "./GrammarCompilerNode"
/*FOR_TYPES_ONLY*/ import GrammarNodeTypeDefinitionNode from "./GrammarNodeTypeDefinitionNode"

import types from "../types"

abstract class AbstractRuntimeNonRootNode extends AbstractRuntimeNode {
  getProgram() {
    return (<AbstractRuntimeNode>this.getParent()).getProgram()
  }

  getGrammarProgram() {
    return this.getDefinition().getProgram()
  }

  getDefinition(): GrammarNodeTypeDefinitionNode {
    // todo: do we need a relative to with this firstWord path?
    return <GrammarNodeTypeDefinitionNode>this._getNodeTypeDefinitionByName(this.getFirstWordPath())
  }

  getCompilerNode(targetLanguage: types.targetLanguageId): GrammarCompilerNode {
    return this.getDefinition().getDefinitionCompilerNode(targetLanguage, this)
  }

  getParsedWords() {
    return this._getGrammarBackedCellArray().map(word => word.getParsed())
  }

  getCompiledIndentation(targetLanguage: types.targetLanguageId) {
    const compiler = this.getCompilerNode(targetLanguage)
    const indentCharacter = compiler.getIndentCharacter()
    const indent = this.getIndentation()
    return indentCharacter !== undefined ? indentCharacter.repeat(indent.length) : indent
  }

  getCompiledLine(targetLanguage: types.targetLanguageId) {
    const compiler = this.getCompilerNode(targetLanguage)
    const listDelimiter = compiler.getListDelimiter()
    const str = compiler.getTransformation()
    return str ? TreeUtils.formatStr(str, listDelimiter, this.cells) : this.getLine()
  }

  compile(targetLanguage: types.targetLanguageId) {
    return this.getCompiledIndentation(targetLanguage) + this.getCompiledLine(targetLanguage)
  }

  getErrors() {
    // Not enough parameters
    // Too many parameters
    // Incorrect parameter

    const errors = this._getGrammarBackedCellArray()
      .map(check => check.getErrorIfAny())
      .filter(i => i)
    // More than one
    const definition = this.getDefinition()
    let times
    const firstWord = this.getFirstWord()
    if (definition.isSingle() && (times = this.getParent().findNodes(firstWord).length) > 1)
      errors.push({
        kind: GrammarConstantsErrors.nodeTypeUsedMultipleTimesError,
        subkind: firstWord,
        level: 0,
        context: this.getParent().getLine(),
        message: `${
          GrammarConstantsErrors.nodeTypeUsedMultipleTimesError
        } nodeType "${firstWord}" used '${times}' times. '${this.getLine()}' at line '${this.getPoint().y}'`
      })

    return this._getRequiredNodeErrors(errors)
  }

  get cells() {
    const cells: types.stringMap = {}
    this._getGrammarBackedCellArray()
      .slice(1)
      .forEach(cell => {
        if (!cell.isCatchAll()) cells[cell.getCellTypeName()] = cell.getParsed()
        else {
          if (!cells[cell.getCellTypeName()]) cells[cell.getCellTypeName()] = []
          cells[cell.getCellTypeName()].push(cell.getParsed())
        }
      })
    return cells
  }

  protected _getGrammarBackedCellArray(): AbstractGrammarBackedCell<any>[] {
    const definition = this.getDefinition()
    const grammarProgram = definition.getProgram()
    const requiredCellTypesNames = definition.getRequiredCellTypeNames()
    const firstCellTypeName = definition.getFirstCellType()
    const numberOfRequiredCells = requiredCellTypesNames.length + 1 // todo: assuming here first cell is required.

    const catchAllCellTypeName = definition.getCatchAllCellTypeName()

    const actualWordCountOrRequiredCellCount = Math.max(this.getWords().length, numberOfRequiredCells)
    const cells: AbstractGrammarBackedCell<any>[] = []

    // A for loop instead of map because "numberOfCellsToFill" can be longer than words.length
    for (let cellIndex = 0; cellIndex < actualWordCountOrRequiredCellCount; cellIndex++) {
      const isCatchAll = cellIndex >= numberOfRequiredCells

      let cellTypeName
      if (cellIndex === 0) cellTypeName = firstCellTypeName
      else if (isCatchAll) cellTypeName = catchAllCellTypeName
      else cellTypeName = requiredCellTypesNames[cellIndex - 1]

      const cellTypeDefinition = grammarProgram.getCellTypeDefinition(cellTypeName)

      let cellConstructor
      if (cellTypeDefinition) cellConstructor = cellTypeDefinition.getCellConstructor()
      else if (cellTypeName) cellConstructor = GrammarUnknownCellTypeCell
      else cellConstructor = GrammarExtraWordCellTypeCell

      cells[cellIndex] = new cellConstructor(this, cellIndex, cellTypeDefinition, cellTypeName, isCatchAll)
    }
    return cells
  }

  // todo: just make a fn that computes proper spacing and then is given a node to print
  getLineCellTypes() {
    return this._getGrammarBackedCellArray()
      .map(slot => slot.getCellTypeName())
      .join(" ")
  }

  getLineHighlightScopes(defaultScope = "source") {
    return this._getGrammarBackedCellArray()
      .map(slot => slot.getHighlightScope() || defaultScope)
      .join(" ")
  }
}

export default AbstractRuntimeNonRootNode
