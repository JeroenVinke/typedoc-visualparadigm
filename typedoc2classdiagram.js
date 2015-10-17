var builder = require('xmlbuilder');
var randomstring = require("randomstring");

var xmlElement;
var modelsElement;
var classDiagramElement;
var classes = [];

module.exports = function (json) {

    xmlElement = builder.create('Project', { encoding: 'UTF-8' })
        .att('UmlVersion', '2.x')
        .att('Xml_structure', 'simple');

    xmlElement.ele('ProjectInfo')
        .ele('LogicalView')


    GetClasses(json);
    modelsElement = xmlElement.ele('Models');

    for (var i = 0; i < classes.length; i++) {
        var _class = classes[i];

        GenerateClassModel(_class);
    }

    AddClassesToDiagram();
    AddAssociationsToDiagram();

    return xmlElement.end({ pretty: true });
}


function AddClassesToDiagram() {
    classDiagramElement = xmlElement.ele('Diagrams')
        .ele('ClassDiagram')
        .att('AutoFitShapesSize', 'true');

    var shapes = classDiagramElement.ele('Shapes');

    for (var i = 0; i < classes.length; i++) {
        var _class = classes[i];

        var _classElement = Shapes.ele('Class')
            .att('Id', _class.Idref)
            .att('MetaModelElement', _class.Id)
            .att('Model', _class.Id)
            .att('Name', _class.name);
    }
}




function AddAssociationsToDiagram() {

}



function GenerateClassModel(_class) {
    var _classElement = modelsElement.ele('Class')
            .att('Id', _class.Id)
            .att('Name', _class.name);

    GenerateAttributeOrMethods(_class, _classElement);

    GenerateAssociations(_class);

    var masterView = _classElement.ele('MasterView')
        .ele('Class')
        .att('Idref', _class.Idref)
        .att('Name', _class.name);
}


function GenerateAssociations(_class) {
    if (!_class.children) return;

    for (var x = 0; x < _class.children.length; x++) {
        var prop = _class.children[x];
        if (prop.kindString != "Property") continue;
        if(!prop.type || !prop.type.id) continue;

        console.log(prop.type.id);
        var otherClass = GetClassById(prop.type.id);

        var association = modelsElement
            .ele('Association')
            .att('EndRelationshipFromMetaModelElement', _class.Id)
            .att('EndRelationshipToMetaModelElement', otherClass.Id)
            .att('Id', GenerateId())

        association
            .ele('FromEnd')
            .ele('AssociationEnd', {
                Id: GenerateId(),
                EndModelElement: _class.Id
            })
            .ele('Type')
            .ele('Class')
                .att('Idref', _class.Id)
                .att('Name', _class.name);

        association
            .ele('FromEnd')
            .ele('AssociationEnd', {
                Id: GenerateId(),
                EndModelElement: otherClass.Id
            })
            .ele('Type')
            .ele('Class')
                .att('Idref', otherClass.Id)
                .att('Name', otherClass.name);

    }
}

function GetClasses(json) {
    classes = [];

    for (var i = 0; i < json.children.length; i++) {
        var file = json.children[i];
        if (!file.children) continue;

        for (var l = 0; l < file.children.length; l++) {
            var classObj = file.children[l];
            if (classObj.kindString != "Class") continue;

            classObj.Id = GenerateId();
            classObj.Idref = GenerateId();

            if (classObj.children) {
                for (var x = 0; x < classObj.children.length; x++) {
                    var child = classObj.children[x];
                    child.Id = GenerateId();
                }
            }

            classes.push(classObj);
        }
    }
}

function GetClassById(id) {
    for (var i = 0; i < classes.length; i++) {
        if (classes[i].id == id) return classes[i];
    }
}

function GenerateAttributeOrMethods(_class, _classElement) {

    var modelChildren = _classElement.ele('ModelChildren');

    if (!_class.children) return;

    for (var x = 0; x < _class.children.length; x++) {
        var methodOrAttribute = _class.children[x];
        var kind = methodOrAttribute.kindString;
        var type = kind;

        if (kind == "Method") {
            var method = methodOrAttribute;
            var signature = method.signatures[0];
            method.Id = GenerateId();

            var operationChildren = modelChildren.ele('Operation')
                .att('ReturnType', GetTypeName(signature.type))
                .att("Id", method.Id)
                .att("Name", method.name)
                .ele("ModelChildren");


            if (signature.parameters) {
                for (var f = 0; f < signature.parameters.length; f++) {
                    var parameter = signature.parameters[0];
                    parameter.Id = GenerateId();

                    var paramElement = operationChildren
                    .ele('Parameter')
                    .att('Id', parameter.Id)
                    .att('Name', parameter.name);

                    paramElement.att('Type', GetTypeName(parameter.type));
                }
            }
        }

        if (kind == "Property") {
            var attr = methodOrAttribute;

            // don't create attributes for references which have an id, an association will be drawn later
            // classes that are not in the typedoc don't have an id
            if (attr.type && attr.type.type == "reference") {
                if (attr.type.id) continue;
            }

            modelChildren.ele('Attribute')
            .att('Id', attr.Id)
            .att('Name', attr.name)
            .att('Type', GetTypeName(attr.type));
        }
    }
}

function GenerateId() {
    return randomstring.generate({
        length: 12,
        charset: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
}

function GetTypeName(type) {
    if (!type) {
        return 'void';
    }

    // generics
    if (type.name && type.typeArguments) {
        var types = '';

        for (var i = 0; i < type.typeArguments.length; i++) {
            var typeArg = type.typeArguments[i];
            types += ',' + GetTypeName(typeArg);
        }

        return type.name + '<' + types.slice(1, types.length) + '>';
    }

    if (type.name) {
        return type.name;
    }

    return 'void';
}