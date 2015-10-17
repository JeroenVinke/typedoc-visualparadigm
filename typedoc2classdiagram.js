var builder = require('xmlbuilder');
var randomstring = require("randomstring");

var xmlElement;
var modelsElement;
var shapesElement;
var classDiagramElement;
var classes = [];

module.exports = function (json) {

    xmlElement = builder.create('Project', { encoding: 'UTF-8' })
        .att('UmlVersion', '2.x')
        .att('Xml_structure', 'simple');

    xmlElement.ele('ProjectInfo')
        .ele('LogicalView')


    LoadClasses(json);

    modelsElement = xmlElement.ele('Models');

    classes.forEach(function (_class) {
        GenerateClassModel(_class);
    });

    AddClassesToDiagram();
    AddAssociationsToDiagram();

    return xmlElement.end({ pretty: true });
}


function AddClassesToDiagram() {
    classDiagramElement = xmlElement.ele('Diagrams')
        .ele('ClassDiagram')
        .att('AutoFitShapesSize', 'true');

    shapesElement = classDiagramElement.ele('Shapes');

    classes.forEach(function (_class) {
        var _classElement = shapesElement.ele('Class')
            .att('Id', _class.Idref)
            .att('MetaModelElement', _class.Id)
            .att('Model', _class.Id)
            .att('Name', _class.name);
    });
}




function AddAssociationsToDiagram() {
    var connectorsElement = classDiagramElement.ele('Connectors');

    modelsElement.children.forEach(function (child) {
        if (child.name != "Association") return;

        var associationId = child.attributes.Id.value;
        var class1Id = child.attributes.EndRelationshipFromMetaModelElement.value;
        var class2Id = child.attributes.EndRelationshipToMetaModelElement.value;

        var classShape1Id;
        var classShape2Id;

        shapesElement.children.forEach(function (_class) {
            if (_class.name != "Class") return;

            var model = _class.attributes.Model.value;
            if (model == class1Id) {
                classShape1Id = _class.attributes.Id.value;
            } else if (model == class2Id) {
                classShape2Id = _class.attributes.Id.value;
            }
        });

        var idref;
        child.children.forEach(function (_child) {
            if (_child.name != "MasterView") return;

            idref = _child.children[0].attributes.Idref.value;
        });

        connectorsElement.ele('Association')
            .att('Id', idref)
            .att('From', classShape1Id)
            .att('To', classShape2Id)
            .att('Element', associationId)
            .att('Model', associationId);
    });
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

    _class.children.forEach(function (prop) {
        if (prop.kindString != "Property") return;
        if(!prop.type || !prop.type.id) return;

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
            .ele('ToEnd')
            .ele('AssociationEnd', {
                Id: GenerateId(),
                EndModelElement: otherClass.Id
            })
            .ele('Type')
            .ele('Class')
                .att('Idref', otherClass.Id)
                .att('Name', otherClass.name);

        association
            .ele('MasterView')
            .ele('Association')
            .att('Idref', GenerateId());

    });
}

function LoadClasses(json) {
    classes = [];

    json.children.forEach(function (file) {
        if(!file.children) return;

        file.children.forEach(function (classObj) {
            if (classObj.kindString != "Class") return;

            classObj.Id = GenerateId();
            classObj.Idref = GenerateId();

            classes.push(classObj);
        });
    });
}

function GetClassById(id) {
    var foundClass;

    classes.forEach(function (_class) {
        if (_class.id == id) foundClass = _class;
    });

    return foundClass;
}

function GenerateAttributeOrMethods(_class, _classElement) {

    var modelChildren = _classElement.ele('ModelChildren');

    if (!_class.children) return;

    _class.children.forEach(function (methodOrAttribute) {
        var kind = methodOrAttribute.kindString;
        var type = kind;
        methodOrAttribute.Id = GenerateId();

        if (kind == "Method") {
            var method = methodOrAttribute;
            var signature = method.signatures[0];

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
                if (attr.type.id) return;
            }

            modelChildren.ele('Attribute')
            .att('Id', attr.Id)
            .att('Name', attr.name)
            .att('Type', GetTypeName(attr.type));
        }
    });
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