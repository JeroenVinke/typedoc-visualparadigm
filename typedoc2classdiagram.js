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

    return xmlElement.end({ pretty: true });
}


function GenerateClassModel(_class) {
    var _classElement = modelsElement.ele('Class')
            .att('Id', _class.Id)
            .att('Name', _class.name);

    GenerateAttributeOrMethods(_class, _classElement);

    var masterView = _classElement.ele('MasterView')
        .ele('Class')
        .att('Idref', _class.Idref)
        .att('Name', _class.name);
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

            var attrElement = modelChildren.ele('Attribute')
            .att('Id', attr.Id)
            .att('Name', attr.name)

            if (attr.type && attr.type.type == "reference" && attr.type.id) {
                var classReference = GetClassById(attr.type.id);
                attrElement.ele('Type')
                    .ele('Class')
                    .att('Idref', classReference.Id)
                    .att('Name', classReference.name)
            }
            else {
                attrElement.att('Type', GetTypeName(type));
            }
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