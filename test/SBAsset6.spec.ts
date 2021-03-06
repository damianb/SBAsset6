//
// SBAsset6 - JS library for working with SBAsset6 archive format
// ---
// @copyright (c) 2018 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/SBAsset6>
//

import * as path from 'path'
import * as fs from 'fs'
import { expect } from 'chai'
import { Uint64BE } from 'int64-buffer'
import { SBAsset6 } from './../src/SBAsset6'
import { ConsumableBuffer } from 'byteaccordion'

describe('SBAsset6', () => {
  describe('SBAsset6._readHeader', () => {
    it('should throw if the file does not appear to be an SBAsset6 formatted archive', async () => {
      const buf = Buffer.from('BADERROR00000000')
      const sbuf = new ConsumableBuffer(buf)

      let res = null
      try {
        await SBAsset6._readHeader(sbuf)
      } catch (err) {
        res = err
      }
      expect(res).to.be.an.instanceof(Error)
      expect(res.message).to.equal('File does not appear to be SBAsset6 format.')
    })

    it('should return the correct metadata position from a provided header', async () => {
      const buf = Buffer.from([
        0x53, 0x42, 0x41, 0x73, 0x73, 0x65, 0x74, 0x36,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x67
      ])
      const sbuf = new ConsumableBuffer(buf)
      const expected = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x67]))

      const res = await SBAsset6._readHeader(sbuf)
      expect(res).to.deep.equal(expected)
    })
  })

  describe('SBAsset6._readMetatable', () => {
    it('should return the correct metatable information from a provided metatable', async () => {
      const buf = Buffer.from([
        0x00, 0x49, 0x4E, 0x44, 0x45, 0x58, 0x01, 0x08,
        0x70, 0x72, 0x69, 0x6F, 0x72, 0x69, 0x74, 0x79,
        0x04, 0xCA, 0xC0, 0xDF, 0x8F, 0x7E, 0x01, 0x1D,
        0x2F, 0x75, 0x6E, 0x69, 0x76, 0x65, 0x72, 0x73,
        0x65, 0x5F, 0x73, 0x65, 0x72, 0x76, 0x65, 0x72,
        0x2E, 0x63, 0x6F, 0x6E, 0x66, 0x69, 0x67, 0x2E,
        0x70, 0x61, 0x74, 0x63, 0x68, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x57
      ])
      const metatablePosition = new Uint64BE(1)
      const sbuf = new ConsumableBuffer(buf)
      const expected = {
        metadata: {
          priority: 9999999999
        },
        filetable: [
          {
            offset: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10])),
            filelength: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57])),
            path: '/universe_server.config.patch'
          }
        ]
      }

      const res = await SBAsset6._readMetatable(sbuf, metatablePosition)
      expect(res).to.deep.equal(expected)
    })
  })

  describe('SBAsset6._buildMetatable', () => {
    it('should correctly build a valid metatable', async () => {
      const buf = Buffer.from([
        0x49, 0x4E, 0x44, 0x45, 0x58, 0x01, 0x08, 0x70,
        0x72, 0x69, 0x6F, 0x72, 0x69, 0x74, 0x79, 0x04,
        0xCA, 0xC0, 0xDF, 0x8F, 0x7E, 0x01, 0x1D, 0x2F,
        0x75, 0x6E, 0x69, 0x76, 0x65, 0x72, 0x73, 0x65,
        0x5F, 0x73, 0x65, 0x72, 0x76, 0x65, 0x72, 0x2E,
        0x63, 0x6F, 0x6E, 0x66, 0x69, 0x67, 0x2E, 0x70,
        0x61, 0x74, 0x63, 0x68, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x57
      ])

      const expected = {
        metadata: {
          priority: 9999999999
        },
        filetable: [
          {
            offset: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10])),
            filelength: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57])),
            path: '/universe_server.config.patch'
          }
        ]
      }

      let metatableBuffer = await SBAsset6._buildMetatable(expected.metadata, expected.filetable)

      expect(Buffer.compare(metatableBuffer, buf)).to.equal(0)

      // working around an issue...
      metatableBuffer = Buffer.concat([Buffer.from([0x00]), metatableBuffer])

      const sbuf = new ConsumableBuffer(metatableBuffer)
      const metatablePosition = new Uint64BE(1)
      let res = await SBAsset6._readMetatable(sbuf, metatablePosition)

      expect(res).to.deep.equal(expected)
    })
  })

  describe('SBAsset6._getFile', () => {
    it('should correctly get a file from a provided archive', async () => {
      const buf = Buffer.from([
        0x08, 0x5B, 0x0D, 0x0A, 0x20, 0x20, 0x7B, 0x0D,
        0x0A, 0x20, 0x20, 0x20, 0x20, 0x22, 0x6F, 0x70,
        0x22, 0x3A, 0x20, 0x22, 0x72, 0x65, 0x70, 0x6C,
        0x61, 0x63, 0x65, 0x22, 0x2C, 0x0D, 0x0A, 0x20,
        0x20, 0x20, 0x20, 0x22, 0x70, 0x61, 0x74, 0x68,
        0x22, 0x3A, 0x20, 0x22, 0x2F, 0x77, 0x6F, 0x72,
        0x6B, 0x65, 0x72, 0x50, 0x6F, 0x6F, 0x6C, 0x54,
        0x68, 0x72, 0x65, 0x61, 0x64, 0x73, 0x22, 0x2C,
        0x0D, 0x0A, 0x20, 0x20, 0x20, 0x20, 0x22, 0x76,
        0x61, 0x6C, 0x75, 0x65, 0x22, 0x3A, 0x20, 0x36,
        0x0D, 0x0A, 0x20, 0x20, 0x7D, 0x0D, 0x0A, 0x5D
      ])
      const sbuf = new ConsumableBuffer(buf)
      const offset = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]))
      const length = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57]))
      const expected = await fs.promises.readFile(path.join(__dirname, '/samples/universe_server.config.patch'), {
        encoding: 'utf8',
        flag: 'r'
      })

      const res = await SBAsset6._getFile(sbuf, offset, length)
      expect(res.toString('utf8')).to.equal(expected)
    })
  })
})

describe('SBAsset6 integration test', () => {
  describe('SBAsset6 read funcitonality', () => {
    it('should work as expected on a small sample SBAsset6 archive', async () => {
      const filename = path.join(__dirname, '/samples/more-threads.pak')
      const pak = new SBAsset6(filename)
      let expected = {
        metadata: {
          priority: 9999999999
        },
        files: [
          '/universe_server.config.patch'
        ]
      }
      let res = await pak.load()
      expect(res).to.deep.equal(expected)

      let expectedFile = await fs.promises.readFile(path.join(__dirname, '/samples/universe_server.config.patch'), { encoding: 'utf8', flag: 'r' })
      let resultFile = await pak.files.getFile('/universe_server.config.patch')
      expect(resultFile.toString('utf8')).to.equal(expectedFile)
    })

    it('should work as expected on a large sample SBAsset6 archive', async () => {
      const filename = path.join(__dirname, '/samples/ExampleMod.pak')
      const pak = new SBAsset6(filename)
      let expected = {
        metadata: JSON.parse(await fs.promises.readFile(path.join(__dirname, '/samples/ExampleMod.metadata'), { encoding: 'utf8', flag: 'r' })),
        files: [
          '/items/somefile3.json',
          '/items/generic/crafting/somefile7.json',
          '/items/generic/crafting/somefile4.json',
          '/items/blah/somefile.json',
          '/items/somefile5.json',
          '/items/somefile2.json',
          '/items/generic/somefile3.json',
          '/items/generic/somefile.json',
          '/items/blah/somefile3.json',
          '/items/generic/crafting/somefile.json',
          '/items/generic/crafting/somefile9.json',
          '/items/generic/crafting/somefile6.json',
          '/items/generic/crafting/somefile3.json',
          '/items/somefile.json',
          '/items/somefile4.json',
          '/items/generic/somefile2.json',
          '/items/blah/somefile2.json',
          '/items/generic/crafting/somefile8.json',
          '/items/generic/crafting/somefile5.json',
          '/items/generic/crafting/somefile2.json'
        ]
      }
      let res = await pak.load()
      expect(res).to.deep.equal(expected)
    })
  })

  describe('SBAsset6 write functionality', () => {
    const tmpDir = path.join(__dirname, '/tmp')
    afterEach(async () => {
      let files = await fs.promises.readdir(tmpDir)
      for (const file of files) {
        if (file === '.gitkeep') {
          continue
        }

        try {
          await fs.promises.unlink(path.join(tmpDir, file))
        } catch (err) {
          // noop
        }
      }
    })

    it('should be able to write a simple SBAsset6 archive (slow running test)', async function () { // tslint:disable-line
      this.slow(2000)
      this.timeout(5000)

      const filePath = path.join(tmpDir, '/smalltest.pak')
      const metadata = {
        priority: 9999999999
      }
      let files: { [index: string]: string } = {
        '/universe_server.config.patch': path.join(__dirname, '/samples/universe_server.config.patch')
      }

      const pak = new SBAsset6(filePath)
      pak.metadata = metadata

      for (const file in files) {
        await pak.files.setFile(file, {
          source: {
            path: files[file]
          }
        })
      }

      let res = await pak.save()

      expect(res.metadata).to.deep.equal(pak.metadata)
      expect(res.files).to.deep.equal(Object.keys(files))

      for (const file in files) {
        let virtualFile = (await pak.files.getFile(file)).toString()
        let expected = await fs.promises.readFile(files[file], { encoding: 'utf8', flag: 'r' })
        expect(virtualFile).to.equal(expected)
      }
    })

    it('should be able to write a large SBAsset6 archive (slow running test)', async function () { // tslint:disable-line
      this.slow(2000)
      this.timeout(5000)

      const filePath = path.join(tmpDir, '/bigtest.pak')
      const metadata = {
        priority: 9999999999
      }
      const sourcePath = path.join(__dirname, '/samples/ExampleMod/')
      let files: { [index: string]: string } = {
        '/items/somefile3.json': path.join(sourcePath, '/items/somefile3.json'),
        '/items/generic/crafting/somefile7.json': path.join(sourcePath, '/items/generic/crafting/somefile7.json'),
        '/items/generic/crafting/somefile4.json': path.join(sourcePath, '/items/generic/crafting/somefile4.json'),
        '/items/blah/somefile.json': path.join(sourcePath, '/items/blah/somefile.json'),
        '/items/somefile5.json': path.join(sourcePath, '/items/somefile5.json'),
        '/items/somefile2.json': path.join(sourcePath, '/items/somefile2.json'),
        '/items/generic/somefile3.json': path.join(sourcePath, '/items/generic/somefile3.json'),
        '/items/generic/somefile.json': path.join(sourcePath, '/items/generic/somefile.json'),
        '/items/blah/somefile3.json': path.join(sourcePath, '/items/blah/somefile3.json'),
        '/items/generic/crafting/somefile.json': path.join(sourcePath, '/items/generic/crafting/somefile.json'),
        '/items/generic/crafting/somefile9.json': path.join(sourcePath, '/items/generic/crafting/somefile9.json'),
        '/items/generic/crafting/somefile6.json': path.join(sourcePath, '/items/generic/crafting/somefile6.json'),
        '/items/generic/crafting/somefile3.json': path.join(sourcePath, '/items/generic/crafting/somefile3.json'),
        '/items/somefile.json': path.join(sourcePath, '/items/somefile.json'),
        '/items/somefile4.json': path.join(sourcePath, '/items/somefile4.json'),
        '/items/generic/somefile2.json': path.join(sourcePath, '/items/generic/somefile2.json'),
        '/items/blah/somefile2.json': path.join(sourcePath, '/items/blah/somefile2.json'),
        '/items/generic/crafting/somefile8.json': path.join(sourcePath, '/items/generic/crafting/somefile8.json'),
        '/items/generic/crafting/somefile5.json': path.join(sourcePath, '/items/generic/crafting/somefile5.json'),
        '/items/generic/crafting/somefile2.json': path.join(sourcePath, '/items/generic/crafting/somefile2.json')
      }

      const pak = new SBAsset6(filePath)
      pak.metadata = metadata

      for (const file in files) {
        await pak.files.setFile(file, {
          source: {
            path: files[file]
          }
        })
      }

      const res = await pak.save()

      expect(res.metadata).to.deep.equal(pak.metadata)
      expect(res.files).to.deep.equal(Object.keys(files))

      for (const file in files) {
        const virtualFile = (await pak.files.getFile(file)).toString()
        const expected = await fs.promises.readFile(files[file], { encoding: 'utf8', flag: 'r' })
        expect(virtualFile).to.equal(expected)
      }
    })

    it('should be able to modify an SBAsset6 archive (slow running test)', async function () { // tslint:disable-line
      this.slow(5000)
      this.timeout(20000)

      const filePath = path.join(tmpDir, '/bigmodtest.pak')
      const sourcePath = path.join(__dirname, '/samples/ExampleMod/')

      let expected: { metadata: { [index: string]: any }, files: { [index: string]: string } } = {
        metadata: JSON.parse(await fs.promises.readFile(path.join(__dirname, '/samples/ExampleMod.metadata'), { encoding: 'utf8', flag: 'r' })),
        files: {
          '/items/somefile3.json': path.join(sourcePath, '/items/somefile3.json'),
          '/items/generic/crafting/somefile7.json': path.join(sourcePath, '/items/generic/crafting/somefile7.json'),
          '/items/generic/crafting/somefile4.json': path.join(sourcePath, '/items/generic/crafting/somefile4.json'),
          '/items/blah/somefile.json': path.join(sourcePath, '/items/blah/somefile.json'),
          '/items/somefile5.json': path.join(sourcePath, '/items/somefile5.json'),
          '/items/somefile2.json': path.join(sourcePath, '/items/somefile2.json'),
          '/items/generic/somefile3.json': path.join(sourcePath, '/items/generic/somefile3.json'),
          '/items/generic/somefile.json': path.join(sourcePath, '/items/generic/somefile.json'),
          '/items/blah/somefile3.json': path.join(sourcePath, '/items/blah/somefile3.json'),
          '/items/generic/crafting/somefile.json': path.join(sourcePath, '/items/generic/crafting/somefile.json'),
          '/items/generic/crafting/somefile9.json': path.join(sourcePath, '/items/generic/crafting/somefile9.json'),
          '/items/generic/crafting/somefile6.json': path.join(sourcePath, '/items/generic/crafting/somefile6.json'),
          '/items/generic/crafting/somefile3.json': path.join(sourcePath, '/items/generic/crafting/somefile3.json'),
          '/items/somefile.json': path.join(sourcePath, '/items/somefile.json'),
          '/items/somefile4.json': path.join(sourcePath, '/items/somefile4.json'),
          '/items/generic/somefile2.json': path.join(sourcePath, '/items/generic/somefile2.json'),
          '/items/blah/somefile2.json': path.join(sourcePath, '/items/blah/somefile2.json'),
          '/items/generic/crafting/somefile8.json': path.join(sourcePath, '/items/generic/crafting/somefile8.json'),
          '/items/generic/crafting/somefile5.json': path.join(sourcePath, '/items/generic/crafting/somefile5.json'),
          '/items/generic/crafting/somefile2.json': path.join(sourcePath, '/items/generic/crafting/somefile2.json'),
          '/universe_server.config.patch': path.join(__dirname, '/samples/universe_server.config.patch')
        }
      }
      expected.metadata.test = 'success'

      await fs.promises.copyFile(path.join(__dirname, '/samples/ExampleMod.pak'), filePath)

      const pak = new SBAsset6(filePath)
      await pak.load()

      pak.metadata.test = 'success'

      await pak.files.setFile('/universe_server.config.patch', {
        source: {
          path: path.join(__dirname, '/samples/universe_server.config.patch')
        }
      })

      const res = await pak.save()

      expect(res.metadata).to.deep.equal(expected.metadata)
      expect(res.files).to.deep.equal(Object.keys(expected.files))

      for (const file in expected.files) {
        const virtualFile = (await pak.files.getFile(file)).toString()
        const expectedContents = await fs.promises.readFile(expected.files[file], { encoding: 'utf8', flag: 'r' })
        expect(virtualFile).to.equal(expectedContents)
      }
    })

    it('should be able to remove files from an SBAsset6 archive (slow running test)', async function () { // tslint:disable-line
      this.slow(5000)
      this.timeout(20000)

      const filePath = path.join(tmpDir, '/bigremtest.pak')
      const sourcePath = path.join(__dirname, '/samples/ExampleMod/')

      let expected: { metadata: { [index: string]: any }, files: { [index: string]: string } } = {
        metadata: JSON.parse(await fs.promises.readFile(path.join(__dirname, '/samples/ExampleMod.metadata'), { encoding: 'utf8', flag: 'r' })),
        files: {
          '/items/somefile3.json': path.join(sourcePath, '/items/somefile3.json'),
          '/items/generic/crafting/somefile7.json': path.join(sourcePath, '/items/generic/crafting/somefile7.json'),
          '/items/generic/crafting/somefile4.json': path.join(sourcePath, '/items/generic/crafting/somefile4.json'),
          '/items/somefile5.json': path.join(sourcePath, '/items/somefile5.json'),
          '/items/somefile2.json': path.join(sourcePath, '/items/somefile2.json'),
          '/items/generic/somefile3.json': path.join(sourcePath, '/items/generic/somefile3.json'),
          '/items/generic/somefile.json': path.join(sourcePath, '/items/generic/somefile.json'),
          '/items/blah/somefile3.json': path.join(sourcePath, '/items/blah/somefile3.json'),
          '/items/generic/crafting/somefile.json': path.join(sourcePath, '/items/generic/crafting/somefile.json'),
          '/items/generic/crafting/somefile9.json': path.join(sourcePath, '/items/generic/crafting/somefile9.json'),
          '/items/generic/crafting/somefile6.json': path.join(sourcePath, '/items/generic/crafting/somefile6.json'),
          '/items/generic/crafting/somefile3.json': path.join(sourcePath, '/items/generic/crafting/somefile3.json'),
          '/items/generic/somefile2.json': path.join(sourcePath, '/items/generic/somefile2.json'),
          '/items/blah/somefile2.json': path.join(sourcePath, '/items/blah/somefile2.json'),
          '/items/generic/crafting/somefile8.json': path.join(sourcePath, '/items/generic/crafting/somefile8.json'),
          '/items/generic/crafting/somefile5.json': path.join(sourcePath, '/items/generic/crafting/somefile5.json'),
          '/items/generic/crafting/somefile2.json': path.join(sourcePath, '/items/generic/crafting/somefile2.json')
        }
      }
      expected.metadata.test = 'success'

      await fs.promises.copyFile(path.join(__dirname, '/samples/ExampleMod.pak'), filePath)

      const pak = new SBAsset6(filePath)
      await pak.load()

      pak.metadata.test = 'success'

      await pak.files.deleteFile('/items/somefile.json')
      await pak.files.deleteFile('/items/somefile4.json')
      await pak.files.deleteFile('/items/blah/somefile.json')

      const res = await pak.save()

      expect(res.metadata).to.deep.equal(expected.metadata)
      expect(res.files).to.deep.equal(Object.keys(expected.files))

      for (const file in expected.files) {
        const virtualFile = (await pak.files.getFile(file)).toString()
        const expectedContents = await fs.promises.readFile(expected.files[file], { encoding: 'utf8', flag: 'r' })
        expect(virtualFile).to.equal(expectedContents)
      }
    })
  })
})
