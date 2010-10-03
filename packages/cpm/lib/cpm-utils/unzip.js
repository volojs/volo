if(typeof Packages !== "undefined"){
    /*
	var ByteString = require("binary").ByteString;
	exports.Unzip = function(fileContents){
		var zipStream = new Packages.java.util.zip.ZipInputStream(new Packages.java.io.ByteArrayInputStream(fileContents._bytes));
		return {
			readEntries: function(){
				var entry;
				this.entries = [];
				var bufferSize = 4096;
				while((entry = zipStream.getNextEntry())){
					var size = 0, buffer = Packages.java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 0);
					do{
						var nextBuffer = Packages.java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, bufferSize);
						var bytesRead = zipStream.read(nextBuffer, 0, nextBuffer.length);
						if(bytesRead > 0){
							var newBuffer = Packages.java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, bytesRead + size);
							Packages.java.lang.System.arraycopy(buffer, 0, newBuffer, 0, size);
							Packages.java.lang.System.arraycopy(nextBuffer, 0, newBuffer, size, bytesRead);
							buffer = newBuffer;
							size += bytesRead;
						}
					}while(bytesRead > 0);
					this.entries.push({
						compressionMethod: 0,
						fileName: entry.getName(),
						data: new ByteString(buffer, 0, buffer.length)
					});
				}
			},
			isZipFile: function(){
				return true;
			}
		}
	}
    */
}
else{
var JSUnzip = function (fileContents) {
    this.fileContents = new JSUnzip.BigEndianBinaryStream(fileContents);
}
exports.Unzip = JSUnzip;
JSUnzip.MAGIC_NUMBER = 0x04034b50;

JSUnzip.prototype = {
    readEntries: function () {
        if (!this.isZipFile()) {
            throw new Error("File is not a Zip file.");
        }

        this.entries = [];
        var e = new JSUnzip.ZipEntry(this.fileContents);
        while (typeof(e.data) === "string") {
            this.entries.push(e);
            e = new JSUnzip.ZipEntry(this.fileContents);
        }
    },

    isZipFile: function () {
        return this.fileContents.getByteRangeAsNumber(0, 4) === JSUnzip.MAGIC_NUMBER;
    }
}

JSUnzip.ZipEntry = function (binaryStream) {
    this.signature          = binaryStream.getNextBytesAsNumber(4);
    if (this.signature !== JSUnzip.MAGIC_NUMBER) {
        return;
    }

    this.versionNeeded      = binaryStream.getNextBytesAsNumber(2);
    this.bitFlag            = binaryStream.getNextBytesAsNumber(2);
    this.compressionMethod  = binaryStream.getNextBytesAsNumber(2);
    this.timeBlob           = binaryStream.getNextBytesAsNumber(4);

    if (this.isEncrypted()) {
        throw "File contains encrypted entry. Not supported.";
    }

    if (this.isUsingUtf8()) {
        throw "File is using UTF8. Not supported.";
    }

    if (this.isUsingBit3TrailingDataDescriptor()) {
        throw "File is using bit 3 trailing data descriptor. Not supported.";
    }

    this.crc32              = binaryStream.getNextBytesAsNumber(4);
    this.compressedSize     = binaryStream.getNextBytesAsNumber(4);
    this.uncompressedSize   = binaryStream.getNextBytesAsNumber(4);

    if (this.isUsingZip64()) {
        throw "File is using Zip64 (4gb+ file size). Not supported";
    }

    this.fileNameLength     = binaryStream.getNextBytesAsNumber(2);
    this.extraFieldLength   = binaryStream.getNextBytesAsNumber(2);

    this.fileName  = binaryStream.getNextBytesAsString(this.fileNameLength);
    this.extra     = binaryStream.getNextBytesAsString(this.extraFieldLength);
    this.data      = binaryStream.getNextBytesAsString(this.compressedSize);
}

JSUnzip.ZipEntry.prototype = {
    isEncrypted: function () {
        return (this.bitFlag & 0x01) === 0x01;
    },

    isUsingUtf8: function () {
        return (this.bitFlag & 0x0800) === 0x0800;
    },

    isUsingBit3TrailingDataDescriptor: function () {
        return (this.bitFlag & 0x0008) === 0x0008;
    },

    isUsingZip64: function () {
        this.compressedSize === 0xFFFFFFFF ||
            this.uncompressedSize === 0xFFFFFFFF;
    }
}

JSUnzip.BigEndianBinaryStream = function (stream) {
    this.stream = stream;
    this.resetByteIndex();
}

JSUnzip.BigEndianBinaryStream.prototype = {
    // The index of the current byte, used when we step through the byte
    // with getNextBytesAs*.
    resetByteIndex: function () {
        this.currentByteIndex = 0;
    },

    // TODO: Other similar JS libs does charCodeAt(index) & 0xff. Grok
    // why, and do that here if neccesary. So far, I've never gotten a
    // char code higher than 255.
    getByteAt: function (index) {
        return this.stream.charCodeAt(index);
    },

    getNextBytesAsNumber: function (steps) {
        var res = this.getByteRangeAsNumber(this.currentByteIndex, steps);
        this.currentByteIndex += steps;
        return res;
    },

    getNextBytesAsString: function (steps) {
        var res = this.getByteRangeAsString(this.currentByteIndex, steps);
        this.currentByteIndex += steps;
        return res;
    },

    // Big endian, so we're going backwards.
    getByteRangeAsNumber: function (index, steps) {
        var result = 0;
        var i = index + steps - 1;
        while (i >= index) {
            result = (result << 8) + this.getByteAt(i);
            i--;
        }
        return result;
    },

    getByteRangeAsString: function (index, steps) {
        var result = "";
        var max = index + steps;
        var i = index;
        while (i < max) {
            result += String.fromCharCode(this.getByteAt(i));
            i++;
        }
        return result;
    }
}
}